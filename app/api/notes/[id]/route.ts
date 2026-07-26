import { NextResponse } from "next/server";
import { updateNote, deleteNote } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    const { title, body } = await req.json();
    const updated = await updateNote(campId, params.id, String(title ?? ""), String(body ?? ""));
    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    await deleteNote(campId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
