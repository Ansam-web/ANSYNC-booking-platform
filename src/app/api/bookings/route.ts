import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/prisma/db";
import { withTenant } from "@/lib/tenant-db";
import { createHash } from "node:crypto";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

const querySchema = z.object({
  tenantId: z.coerce.number().int().positive(),
});

export async function GET(request: Request) {
  try {
    // 1. Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in first.",
          },
        },
        { status: 401 }
      );
    }

    const userId = await verifySessionToken(token);

    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired session.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Validate tenant ID
    const { searchParams } = new URL(request.url);

    const result = querySchema.safeParse({
      tenantId: searchParams.get("tenantId"),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid tenant ID is required.",
          },
        },
        { status: 400 }
      );
    }

    const { tenantId } = result.data;

    // 3. Verify workspace membership
    const membership = await db.orm.public.Membership
      .where({ userId, tenantId })
      .first();

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You cannot access this workspace.",
          },
        },
        { status: 403 }
      );
    }

    // 4. Fetch workspace bookings
       // 4. Fetch workspace bookings
    const bookings = await withTenant(tenantId, async (client) => {
      const result = await client.query(
        `SELECT *
         FROM "Booking"
         WHERE "tenantId" = $1
         ORDER BY "startTime" ASC`,
        [tenantId]
      );

      return result.rows;
    });

    return NextResponse.json(
      { bookings },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch bookings error:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to load bookings.",
        },
      },
      { status: 500 }
    );
  }
}

const createBookingSchema = z.strictObject({
  tenantId: z.number().int().positive().max(2147483647),
  serviceId: z.number().int().positive().max(2147483647),
  startTime: z.iso.datetime({ offset: true }),
});

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    const userId = token
      ? await verifySessionToken(token)
      : null;

    if (!userId) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in first.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Validate idempotency key
    const idempotencyKey = request.headers
      .get("Idempotency-Key")
      ?.trim();

    if (!idempotencyKey || idempotencyKey.length > 128) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid Idempotency-Key is required.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Validate request body
    const body = await request.json().catch(() => null);
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid booking data.",
          },
        },
        { status: 400 }
      );
    }

    const { tenantId, serviceId, startTime } = parsed.data;

    // 4. Verify workspace membership
    const membership = await db.orm.public.Membership
      .where({ userId, tenantId })
      .first();

    if (!membership) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You cannot access this workspace.",
          },
        },
        { status: 403 }
      );
    }

    // 5. Generate request hash
    const normalizedStart = new Date(startTime).toISOString();

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          tenantId,
          serviceId,
          startTime: normalizedStart,
        })
      )
      .digest("hex");

    // 6. Execute tenant-scoped transaction
    const result = await withTenant(tenantId, async (client) => {

      // Serialize booking creation within this workspace
      await client.query(
        "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
        [7241, tenantId]
      );

      // 7. Check existing idempotency record
      const existing = await client.query(
        `SELECT "requestHash", "responseBody", "responseStatus"
         FROM "BookingIdempotency"
         WHERE "tenantId" = $1
           AND "userId" = $2
           AND "key" = $3`,
        [tenantId, userId, idempotencyKey]
      );

      if (existing.rows.length > 0) {
        const saved = existing.rows[0];

        if (saved.requestHash !== requestHash) {
          return {
            status: 409,
            body: {
              error: {
                code: "IDEMPOTENCY_CONFLICT",
                message: "This key was used with different data.",
              },
            },
          };
        }

        return {
          status: saved.responseStatus,
          body: saved.responseBody,
        };
      }

      // 8. Validate service
      const services = await client.query(
        `SELECT id, duration
         FROM "Service"
         WHERE id = $1 AND "tenantId" = $2`,
        [serviceId, tenantId]
      );

      if (services.rows.length === 0) {
        return {
          status: 404,
          body: {
            error: {
              code: "SERVICE_NOT_FOUND",
              message: "Service not found in this workspace.",
            },
          },
        };
      }

      // 9. Calculate booking times
      const start = new Date(normalizedStart);

      if (start.getTime() <= Date.now()) {
        return {
          status: 400,
          body: {
            error: {
              code: "VALIDATION_ERROR",
              message: "Booking must be in the future.",
            },
          },
        };
      }

      const duration = Number(services.rows[0].duration);

      if (!Number.isInteger(duration) || duration <= 0) {
        throw new Error("Invalid service duration.");
      }

      const end = new Date(
        start.getTime() + duration * 60 * 1000
      );

      // 10. Prevent overlapping bookings
      const overlapping = await client.query(
        `SELECT id
         FROM "Booking"
         WHERE "tenantId" = $1
           AND status <> 'CANCELLED'
           AND "startTime" < $3
           AND "endTime" > $2
         LIMIT 1`,
        [tenantId, start.toISOString(), end.toISOString()]
      );

      if (overlapping.rows.length > 0) {
        return {
          status: 409,
          body: {
            error: {
              code: "BOOKING_CONFLICT",
              message: "This time slot is already booked.",
            },
          },
        };
      }

      // 11. Create booking
      const created = await client.query(
        `INSERT INTO "Booking"
          ("tenantId", "userId", "serviceId",
           "startTime", "endTime", status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')
         RETURNING *`,
        [
          tenantId,
          userId,
          serviceId,
          start.toISOString(),
          end.toISOString(),
        ]
      );

      const responseBody = {
        booking: created.rows[0],
      };

      // 12. Save idempotency response
      await client.query(
        `INSERT INTO "BookingIdempotency"
          ("tenantId", "userId", "key", "requestHash",
           "responseBody", "responseStatus")
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [
          tenantId,
          userId,
          idempotencyKey,
          requestHash,
          JSON.stringify(responseBody),
          201,
        ]
      );

      return {
        status: 201,
        body: responseBody,
      };
    });

    return NextResponse.json(result.body, {
      status: result.status,
    });

  } catch (error) {
    console.error("Create booking error:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create booking.",
        },
      },
      { status: 500 }
    );
  }
}