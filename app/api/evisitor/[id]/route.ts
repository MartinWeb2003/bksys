import { NextResponse } from "next/server";
import { updateEvisitor, deleteEvisitor, type EvisitorInput } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    const b = (await req.json()) as EvisitorInput;
    const updated = await updateEvisitor(campId, params.id, b);
    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    await deleteEvisitor(campId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
