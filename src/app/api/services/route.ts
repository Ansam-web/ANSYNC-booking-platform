
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/prisma/db";
import { withTenant } from "@/lib/tenant-db";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

const querySchema = z.object({
  tenantId: z.coerce.number().int().positive().max(2147483647),
});

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const parsed = querySchema.safeParse({
      tenantId: searchParams.get("tenantId"),
    });

    if (!parsed.success) {
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

    const services = await withTenant(
      tenantId,
      async (client) => {
        const result = await client.query(
          `SELECT id, name, description, duration, price
           FROM "Service"
           WHERE "tenantId" = $1
           ORDER BY name ASC`,
          [tenantId]
        );

        return result.rows;
      }
    );

    return NextResponse.json({ services });

  } catch (error) {
    console.error("Fetch services error:", error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to load services.",
        },
      },
      { status: 500 }
    );
  }
}
