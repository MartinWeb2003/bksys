import { NextResponse } from "next/server";
import { updateBooking, deleteBooking, type BookingInput } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    const body = (await req.json()) as BookingInput;
    const updated = await updateBooking(campId, params.id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const campId = await requireCampId();
    await deleteBooking(campId, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
