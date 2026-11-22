
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "ansync_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must contain at least 32 characters"
    );
  }

  return new TextEncoder().encode(secret);
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