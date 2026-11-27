import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/prisma/db";
import { withTenant } from "@/lib/tenant-db";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(2147483647);

type RouteContext = {
  params: Promise<{ bookingId: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
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

    const { bookingId } = await params;
    const { searchParams } = new URL(request.url);

    const parsed = z.object({
      bookingId: idSchema,
      tenantId: idSchema,
    }).safeParse({
      bookingId,
      tenantId: searchParams.get("tenantId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid booking or tenant ID.",
          },
        },
        { status: 400 }
      );
    }

    const { tenantId } = parsed.data;

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

    const booking = await withTenant(
      tenantId,
      async (client) => {
        const result = await client.query(
          `SELECT *
           FROM "Booking"
           WHERE id = $1 AND "tenantId" = $2`,
          [parsed.data.bookingId, tenantId]
        );

        return result.rows[0] ?? null;
      }
    );

    if (!booking) {
      return NextResponse.json(
        {
          error: {
            code: "BOOKING_NOT_FOUND",
            message: "Booking not found.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { booking },
      { status: 200 }
    );

  } catch (error) {
    console.error("Fetch booking error:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to load booking.",
        },
      },
      { status: 500 }
    );
  }
}
const updateBookingSchema = z.strictObject({
  startTime: z.iso.datetime({ offset: true }),
});

function bookingError(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

async function mutateBooking(
  request: Request,
  { params }: RouteContext,
  action: "update" | "delete"
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    const userId = token
      ? await verifySessionToken(token)
      : null;

    if (!userId) {
      return bookingError(
        "UNAUTHORIZED",
        "Please sign in first.",
        401
      );
    }

    const { bookingId } = await params;
    const { searchParams } = new URL(request.url);

    const parsed = z.object({
      bookingId: idSchema,
      tenantId: idSchema,
    }).safeParse({
      bookingId,
      tenantId: searchParams.get("tenantId"),
    });

    if (!parsed.success) {
      return bookingError(
        "VALIDATION_ERROR",
        "Invalid booking or tenant ID.",
        400
      );
    }

    const { tenantId, bookingId: id } = parsed.data;

    const membership = await db.orm.public.Membership
      .where({ userId, tenantId })
      .first();

    if (!membership) {
      return bookingError(
        "FORBIDDEN",
        "You cannot access this workspace.",
        403
      );
    }

    let newStart: Date | null = null;

    if (action === "update") {
      const body = await request.json().catch(() => null);
      const validated = updateBookingSchema.safeParse(body);

      if (!validated.success) {
        return bookingError(
          "VALIDATION_ERROR",
          "Invalid booking data.",
          400
        );
      }

      newStart = new Date(validated.data.startTime);

      if (newStart.getTime() <= Date.now()) {
        return bookingError(
          "VALIDATION_ERROR",
          "Booking must be in the future.",
          400
        );
      }
    }

    return await withTenant(tenantId, async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
        [7241, tenantId]
      );

      const existing = await client.query(
        `SELECT *
         FROM "Booking"
         WHERE id = $1 AND "tenantId" = $2
         FOR UPDATE`,
        [id, tenantId]
      );

      if (existing.rows.length === 0) {
        return bookingError(
          "BOOKING_NOT_FOUND",
          "Booking not found.",
          404
        );
      }

      const booking = existing.rows[0];

      if (
        membership.role !== "OWNER" &&
        booking.userId !== userId
      ) {
        return bookingError(
          "FORBIDDEN",
          "You cannot manage this booking.",
          403
        );
      }

      // DELETE booking
      if (action === "delete") {
        await client.query(
          `DELETE FROM "Booking"
           WHERE id = $1 AND "tenantId" = $2`,
          [id, tenantId]
        );

        return NextResponse.json({
          message: "Booking deleted successfully.",
        });
      }

      // UPDATE booking
      if (booking.status === "CANCELLED") {
        return bookingError(
          "BOOKING_CONFLICT",
          "Cancelled bookings cannot be rescheduled.",
          409
        );
      }

      const start = newStart!;

      const duration =
        new Date(booking.endTime).getTime() -
        new Date(booking.startTime).getTime();

      const end = new Date(start.getTime() + duration);

      const overlapping = await client.query(
        `SELECT id
         FROM "Booking"
         WHERE "tenantId" = $1
           AND id <> $2
           AND status <> 'CANCELLED'
           AND "startTime" < $4
           AND "endTime" > $3
         LIMIT 1`,
        [
          tenantId,
          id,
          start.toISOString(),
          end.toISOString(),
        ]
      );

      if (overlapping.rows.length > 0) {
        return bookingError(
          "BOOKING_CONFLICT",
          "This time slot is already booked.",
          409
        );
      }

      const updated = await client.query(
        `UPDATE "Booking"
         SET "startTime" = $1,
             "endTime" = $2
         WHERE id = $3 AND "tenantId" = $4
         RETURNING *`,
        [
          start.toISOString(),
          end.toISOString(),
          id,
          tenantId,
        ]
      );

      return NextResponse.json({
        booking: updated.rows[0],
      });
    });
  } catch (error) {
    console.error("Booking mutation error:", error);

    return bookingError(
      "INTERNAL_SERVER_ERROR",
      "Unable to manage booking.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  return mutateBooking(request, context, "update");
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  return mutateBooking(request, context, "delete");
}