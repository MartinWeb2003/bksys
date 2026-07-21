// Auth session seam. Pure (jose only, no next/headers, no bcrypt) so it is safe to
// import from edge middleware. The session identifies which Camp (tenant) is logged in.

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "campdesk_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");

/** Mint a signed session token for a camp. */
export async function createSession(campId: string): Promise<string> {
  return new SignJWT({ campId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

/** Verify a session token and return the campId it carries, or null. */
export async function campIdFromToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.campId === "string" ? payload.campId : null;
  } catch {
    return null;
  }
}
