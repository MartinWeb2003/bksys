import { NextResponse } from "next/server";
import { saveKeyGrid } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

// Replace the whole key-tracker grid for the current camp.
export async function PUT(req: Request) {
  try {
    const campId = await requireCampId();
    const body = await req.json();
    const saved = await saveKeyGrid(campId, body);
    return NextResponse.json(saved);
  } catch (e) {
    return apiError(e);
  }
}
