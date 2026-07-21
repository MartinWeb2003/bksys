// Server-only session helpers (use next/headers). Read the current tenant from the cookie.
import { cookies } from "next/headers";
import { SESSION_COOKIE, campIdFromToken } from "./auth";

export class UnauthorizedError extends Error {}

/** Current camp id from the session cookie, or null if not logged in. */
export async function currentCampId(): Promise<string | null> {
  return campIdFromToken(cookies().get(SESSION_COOKIE)?.value);
}

/** Current camp id, or throw 401 (used by API route handlers). */
export async function requireCampId(): Promise<string> {
  const id = await currentCampId();
  if (!id) throw new UnauthorizedError("Not authenticated.");
  return id;
}
