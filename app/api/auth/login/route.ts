import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { findCampByEmail } from "@/lib/data";
import { verifyPassword } from "@/lib/password";
import { rateLimit, clientIp, rateLimited } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 60_000); // 10/min
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const { email, password } = await req.json().catch(() => ({}) as { email?: string; password?: string });
  if (!email || !password) return NextResponse.json({ error: "invalid" }, { status: 401 });

  const camp = await findCampByEmail(String(email));
  // Same generic error whether the email is unknown or the password is wrong (no account enumeration).
  if (!camp || !(await verifyPassword(String(password), camp.passwordHash))) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const token = await createSession(camp.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
