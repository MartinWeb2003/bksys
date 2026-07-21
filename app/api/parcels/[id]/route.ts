import { NextResponse } from "next/server";
import { renameParcel, setParcelType, setParcelCapacity, deleteParcel } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    const body = await req.json();
    if (body.label !== undefined) await renameParcel(campId, params.id, body.label);
    if (body.typeId !== undefined) await setParcelType(campId, params.id, body.typeId);
    if (body.capacity !== undefined) await setParcelCapacity(campId, params.id, Math.max(1, Number(body.capacity) || 1));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    await deleteParcel(campId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
