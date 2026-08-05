import { NextResponse } from "next/server";
import { createEvisitor, type EvisitorInput } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const b = (await req.json()) as EvisitorInput;
    const created = await createEvisitor(campId, b);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
