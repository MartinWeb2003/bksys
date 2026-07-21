import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/data";
import { hashPassword } from "@/lib/password";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token) throw new Error("Missing token.");
    if (!password || String(password).length < 8) throw new Error("Password must be at least 8 characters.");

    const ok = await resetPasswordWithToken(String(token), await hashPassword(String(password)));
    if (!ok) return NextResponse.json({ error: "invalid_token" }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
