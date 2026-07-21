import { NextResponse } from "next/server";
import { createBooking, type BookingInput } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const body = (await req.json()) as BookingInput;
    const created = await createBooking(campId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
