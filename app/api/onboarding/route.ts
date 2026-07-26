import { NextResponse } from "next/server";
import { completeOnboarding, type OnboardingSelection } from "@/lib/data";
import { requireCampId } from "@/lib/session";
import { apiError } from "@/lib/apiError";
import { isBusinessKind } from "@/lib/vocab";

export async function POST(req: Request) {
  try {
    const campId = await requireCampId();
    const body = await req.json();
    const lang = body?.lang === "en" ? "en" : "hr";

    const selections: OnboardingSelection[] = Array.isArray(body?.selections)
      ? body.selections
          .filter((s: unknown): s is { kind: string; count: unknown; capacity: unknown } => !!s && isBusinessKind((s as { kind: string }).kind))
          .map((s: { kind: string; count: unknown; capacity: unknown }) => ({
            kind: s.kind as OnboardingSelection["kind"],
            count: Math.floor(Number(s.count) || 0),
            capacity: Math.max(1, Math.floor(Number(s.capacity) || 1)),
          }))
      : [];

    await completeOnboarding(campId, selections, lang);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
