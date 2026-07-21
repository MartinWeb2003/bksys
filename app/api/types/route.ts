import { NextResponse } from "next/server";
import { createParcelType } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const { name, order } = await req.json();
    if (!name?.trim()) throw new Error("Name is required.");
    const created = await createParcelType(campId, name, order ?? 0);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
