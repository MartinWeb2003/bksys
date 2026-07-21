import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, campIdFromToken } from "@/lib/auth";

// Everything is behind auth except the login/register pages and their APIs.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot",
  "/reset",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot",
  "/api/auth/reset",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const campId = await campIdFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (campId) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
