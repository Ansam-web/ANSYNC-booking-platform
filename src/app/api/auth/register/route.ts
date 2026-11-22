
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/prisma/db";
import {
  createSessionToken,
  sessionCookieName,
} from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid registration data",
          errors: z.treeifyError(result.error),
        },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    const existingUser = await db.orm.public.User
      .where({ email })
      .first();

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.orm.public.User.create({
      name,
      email,
      passwordHash,
    });

    
    const token = await createSessionToken(user.id);

    const response = NextResponse.json(
    {
        message: "Account created successfully",
        user: {
        id: user.id,
        name: user.name,
        email: user.email,
        },
    },
    { status: 201 }
    );

    response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
