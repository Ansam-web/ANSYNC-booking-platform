
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { db } from "@/prisma/db";
import {
  sessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Organization name is too short"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Invalid workspace URL"
    ),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Please sign in first." },
        { status: 401 }
      );
    }

    const userId = await verifySessionToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = workspaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid workspace information." },
        { status: 400 }
      );
    }

    const { name, slug } = result.data;

    
    const existingTenant = await db.orm.public.Tenant
    .where({ slug })
    .first();

    if (existingTenant) {
    return NextResponse.json(
        { message: "This workspace URL is already taken." },
        { status: 409 }
    );
    }

    const tenant = await db.transaction(async (tx) => {
    const newTenant = await tx.orm.public.Tenant.create({
        name,
        slug,
    });

    await tx.orm.public.Membership.create({
        tenantId: newTenant.id,
        userId,
        role: "OWNER",
    });

    return newTenant;
    });

    
    return NextResponse.json(
    {
        message: "Workspace created successfully",
        tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        },
    },
    { status: 201 }
    );

  } catch (error) {
    console.error("Workspace setup error:", error);

    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}