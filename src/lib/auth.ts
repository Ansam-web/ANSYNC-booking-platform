
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/lib/env";

const SESSION_COOKIE = "ansync_session";

function getSessionSecret() {
  const { SESSION_SECRET } = getServerEnv();

  return new TextEncoder().encode(SESSION_SECRET);
}

export async function createSessionToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(
      token,
      getSessionSecret(),
      { algorithms: ["HS256"] }
    );

    if (
      typeof payload.userId !== "number" ||
      !Number.isSafeInteger(payload.userId) ||
      payload.userId <= 0
    ) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

export const sessionCookieName = SESSION_COOKIE;