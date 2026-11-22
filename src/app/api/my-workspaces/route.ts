
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/prisma/db";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

export async function GET() {
  try {
    // 1. Read the session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Please sign in first." },
        { status: 401 }
      );
    }

    // 2. Verify the session and identify the user
    const userId = await verifySessionToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    // 3. Find the user's memberships
    const memberships = await db.orm.public.Membership
      .where({ userId })
      .all();

    // 4. Fetch only the workspaces they belong to
    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const tenant = await db.orm.public.Tenant
          .where({ id: membership.tenantId })
          .first();

        if (!tenant) return null;

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          role: membership.role,
        };
      })
    );

    return NextResponse.json({
      workspaces: workspaces.filter(
        (workspace) => workspace !== null
      ),
    });
  } catch (error) {
    console.error("Fetch workspaces error:", error);

    return NextResponse.json(
      { message: "Unable to load workspaces." },
      { status: 500 }
    );
  }
}