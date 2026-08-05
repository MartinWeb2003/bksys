"use client";

import { addDays, formatDate } from "@/lib/dates";
import type { EvisitorDTO } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export default function EvisitorView({
  entries,
  L,
  today,
  labelOf,
  onEdit,
  onDelete,
  onCreate,
}: {
  entries: EvisitorDTO[];
  L: Strings;
  today: string;
  labelOf: (parcelId: string) => string;
  onEdit: (e: EvisitorDTO) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  const tomorrow = addDays(today, 1);
  const rows = [...entries].sort((a, b) => a.departure.localeCompare(b.departure));

  // Live counters: distinct parcels occupied and total heads across all age bands.
  const parcelCount = new Set(rows.map((e) => e.parcelId)).size;
  const peopleCount = rows.reduce((s, e) => s + e.adults + e.c1218 + e.c512 + e.c05, 0);

  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200";
  const thNum = th.replace("text-left", "text-center");
  const td = "px-3 py-2 text-sm text-stone-800 border-b border-stone-200";
  const tdNum = td.replace("text-left", "") + " text-center tabular-nums";

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs text-stone-500 max-w-2xl">{L.evHelp}</p>
        <span className="flex-none text-xs font-semibold text-stone-600 bg-stone-100 rounded-full px-3 py-1 whitespace-nowrap">
          {L.evSummary(parcelCount, peopleCount)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>{L.colParcel}</th>
              <th className={thNum}>{L.evAdults}</th>
              <th className={thNum}>{L.evC1218}</th>
              <th className={thNum}>{L.evC512}</th>
              <th className={thNum}>{L.evC05}</th>
              <th className={th}>{L.evDeparture}</th>
              <th className={th + " text-right"}>{L.evAction}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-stone-400">
                  {L.evNoRows}
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const leaving = e.departure === today ? "today" : e.departure === tomorrow ? "tomorrow" : "later";
                const rowBg = leaving === "today" ? "bg-red-400/80" : leaving === "tomorrow" ? "bg-yellow-200" : "hover:bg-stone-50";
                return (
                  <tr key={e.id} className={rowBg}>
                    <td className={td + " font-mono font-semibold"}>{labelOf(e.parcelId)}</td>
                    <td className={tdNum}>{e.adults}</td>
                    <td className={tdNum}>{e.c1218}</td>
                    <td className={tdNum}>{e.c512}</td>
                    <td className={tdNum}>{e.c05}</td>
                    <td className={td}>{formatDate(e.departure)}</td>
                    <td className={td + " text-right whitespace-nowrap"}>
                      <button onClick={() => onEdit(e)} className="text-xs font-medium text-cyan-800 hover:underline">
                        {L.evEdit}
                      </button>
                      <span className="text-stone-300 mx-1.5">/</span>
                      <button onClick={() => onDelete(e.id)} className="text-xs font-medium text-red-700 hover:underline">
                        {L.noteDelete}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={onCreate}
        className="mt-3 px-3.5 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900"
      >
        {L.evAddGuests}
      </button>
    </div>
  );
}
