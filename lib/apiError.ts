import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ConflictError, InUseError, NotFoundError } from "./data";
import { UnauthorizedError } from "./session";

/** Map thrown errors to consistent HTTP responses. */
export function apiError(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (e instanceof NotFoundError) return NextResponse.json({ error: "not_found", message: e.message }, { status: 404 });
  if (e instanceof ConflictError) return NextResponse.json({ error: "conflict", conflict: e.conflict }, { status: 409 });
  if (e instanceof InUseError) return NextResponse.json({ error: "in_use", message: e.message }, { status: 409 });
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
    return NextResponse.json({ error: "duplicate", message: "That name/label is already taken." }, { status: 409 });
  const message = e instanceof Error ? e.message : "Unknown error";
  return NextResponse.json({ error: "bad_request", message }, { status: 400 });
}
