"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STR, DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { BUSINESS_KINDS, type BusinessKindKey } from "@/lib/vocab";

type Row = { count: number; capacity: number };

export default function Onboarding({ campName }: { campName: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const L = STR[lang];

  const selected = Object.keys(rows) as BusinessKindKey[];

  function toggle(kind: BusinessKindKey) {
    setRows((prev) => {
      const next = { ...prev };
      if (next[kind]) {
        delete next[kind];
      } else {
        const def = BUSINESS_KINDS.find((k) => k.key === kind)!;
        next[kind] = { count: def.defaultCount, capacity: def.capacity };
      }
      return next;
    });
  }

  function patch(kind: string, field: keyof Row, value: number) {
    setRows((prev) => ({ ...prev, [kind]: { ...prev[kind], [field]: value } }));
  }

  async function submit() {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    const selections = selected.map((kind) => ({ kind, count: rows[kind].count, capacity: rows[kind].capacity }));
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections, lang }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.message || L.onbError);
    setBusy(false);
  }

  const inp =
    "w-20 border border-stone-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";
  const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1";

  return (
    <div className="min-h-screen bg-stone-100 flex items-start sm:items-center justify-center p-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="bg-white border border-stone-200 rounded-lg shadow-sm w-full max-w-lg p-6 my-6">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-lg font-bold tracking-tight text-stone-800">
            {L.onbTitle}<span className="text-cyan-700">.</span>
          </h1>
          <button
            type="button"
            onClick={() => setLang(lang === "hr" ? "en" : "hr")}
            className="px-2 py-0.5 text-xs font-bold rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
          >
            {L.langOther}
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-5">{L.onbSubtitle(campName)}</p>

        <p className="text-sm font-semibold text-stone-700">{L.onbPrompt}</p>
        <p className="text-[11px] text-stone-400 mb-3">{L.onbHint}</p>

        <div className="space-y-2">
          {BUSINESS_KINDS.map((kind) => {
            const row = rows[kind.key];
            const on = !!row;
            const preview = on ? `${kind.labelPrefix}1–${kind.labelPrefix}${row.count}` : "";
            return (
              <div
                key={kind.key}
                className={`rounded-lg border transition-colors ${on ? "border-cyan-700 bg-cyan-50/50" : "border-stone-200 bg-white"}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(kind.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold ${
                      on ? "bg-cyan-700 border-cyan-700 text-white" : "border-stone-300 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-sm font-medium text-stone-800">{kind.label[lang]}</span>
                </button>

                {on && (
                  <div className="px-3 pb-3 pt-1 flex flex-wrap items-end gap-4 border-t border-cyan-100">
                    <div>
                      <label className={lbl}>{L.onbCountLabel}</label>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={row.count}
                        onChange={(e) => patch(kind.key, "count", Math.max(1, Math.min(300, Math.floor(Number(e.target.value) || 1))))}
                        className={inp}
                      />
                    </div>
                    <div>
                      <label className={lbl}>{L.colCapacity}</label>
                      <input
                        type="number"
                        min={1}
                        value={row.capacity}
                        onChange={(e) => patch(kind.key, "capacity", Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        className={inp}
                      />
                    </div>
                    <p className="text-[11px] text-stone-400 pb-1">{L.onbUnitsPreview(preview)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-3 text-xs text-red-700">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={busy || selected.length === 0}
          className="mt-5 w-full px-4 py-2 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? L.onbCreating : L.onbCreate}
        </button>
        {selected.length === 0 && <p className="mt-2 text-center text-[11px] text-stone-400">{L.onbPickOne}</p>}
      </div>
    </div>
  );
}
