// Minimal in-memory fixed-window rate limiter — no external deps.
// NOTE: state is per-instance, so on multi-instance/serverless it's best-effort. For
// production scale, swap the store for Upstash Redis (@upstash/ratelimit) behind this API.

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __rateBuckets?: Map<string, Bucket> };
const buckets = g.__rateBuckets ?? (g.__rateBuckets = new Map<string, Bucket>());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function rateLimited(retryAfter: number) {
  return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
