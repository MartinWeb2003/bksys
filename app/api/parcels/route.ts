import { NextResponse } from "next/server";
import { createParcel } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const { label, typeId, capacity, order } = await req.json();
    if (!label?.trim() || !typeId) throw new Error("Label and type are required.");
    const created = await createParcel(campId, label, typeId, Math.max(1, Number(capacity) || 1), order ?? 0);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
