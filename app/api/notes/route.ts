import { NextResponse } from "next/server";
import { createNote } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const { title, body } = await req.json();
    const created = await createNote(campId, String(title ?? ""), String(body ?? ""));
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
