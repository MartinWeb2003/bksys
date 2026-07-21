import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { createCampWithDefaults, findCampByEmail } from "@/lib/data";
import { hashPassword } from "@/lib/password";
import { apiError } from "@/lib/apiError";
import { rateLimit, clientIp, rateLimited } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 15 * 60_000); // 5 per 15 min
    if (!rl.ok) return rateLimited(rl.retryAfter);

    const { name, email, password } = await req.json();
    if (!name?.trim() || !email?.trim() || !password) throw new Error("Name, email and password are required.");
    if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");

    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailNorm)) throw new Error("Invalid email address.");

    if (await findCampByEmail(emailNorm)) return NextResponse.json({ error: "email_taken" }, { status: 409 });

    const passwordHash = await hashPassword(String(password));
    const camp = await createCampWithDefaults(String(name).trim(), emailNorm, passwordHash);

    const token = await createSession(camp.id);
    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (e) {
    return apiError(e);
  }
}
