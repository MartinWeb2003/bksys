import { NextResponse } from "next/server";
import { reorderParcels } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) throw new Error("ids must be a string array.");
    await reorderParcels(campId, ids);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
