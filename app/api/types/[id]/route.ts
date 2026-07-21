import { NextResponse } from "next/server";
import { renameParcelType, deleteParcelType } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    const { name } = await req.json();
    if (!name?.trim()) throw new Error("Name is required.");
    const updated = await renameParcelType(campId, params.id, name);
    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    await deleteParcelType(campId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
