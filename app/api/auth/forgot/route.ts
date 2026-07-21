import { NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/data";
import { sendResetEmail } from "@/lib/email";
import { rateLimit, clientIp, rateLimited } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000); // 5 per 15 min
  if (!rl.ok) return rateLimited(rl.retryAfter);

  const { email } = await req.json().catch(() => ({}) as { email?: string });

  // Always respond 200 regardless of whether the email exists (no account enumeration).
  if (email && typeof email === "string") {
    try {
      const result = await createPasswordReset(email);
      if (result) {
        const base = process.env.APP_BASE_URL || "http://localhost:3000";
        const link = `${base}/reset?token=${result.rawToken}`;
        await sendResetEmail(result.camp.email, link);
      }
    } catch (e) {
      // Log, but don't leak failure details to the caller.
      console.error("forgot-password error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
