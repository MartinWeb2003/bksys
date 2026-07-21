"use client";

import { useMemo, useState } from "react";
import { addDays, nightsBetween, overlaps, formatDate } from "@/lib/dates";
import type { BookingDTO, ParcelVM, TypeVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

// Maximal contiguous free window around [from,to] for a parcel that is free there.
function freeWindow(parcelId: string, from: string, to: string, bookings: BookingDTO[]) {
  let start: string | null = null,
    end: string | null = null;
  for (const b of bookings) {
    if (b.parcelId !== parcelId) continue;
    if (b.departure <= from && (start === null || b.departure > start)) start = b.departure;
    if (b.arrival >= to && (end === null || b.arrival < end)) end = b.arrival;
  }
  return { start, end };
}

// For a taken parcel: when it next frees up (latest departure among overlapping bookings).
function freeFrom(parcelId: string, from: string, to: string, bookings: BookingDTO[]) {
  let d: string | null = null;
  for (const b of bookings) {
    if (b.parcelId === parcelId && overlaps(from, to, b.arrival, b.departure) && (d === null || b.departure > d)) d = b.departure;
  }
  return d;
}

export default function AvailabilityView({
  bookings,
  types,
  parcels,
  today,
  L,
  onCreate,
}: {
  bookings: BookingDTO[];
  types: TypeVM[];
  parcels: ParcelVM[];
  today: string;
  L: Strings;
  onCreate: (parcelId: string, from: string, to: string) => void;
}) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(addDays(today, 7));
  const [typeId, setTypeId] = useState("all");
  const nights = nightsBetween(from, to);

  const results = useMemo(() => {
    if (nights <= 0) return [];
    return parcels
      .filter((p) => typeId === "all" || p.typeId === typeId)
      .map((p) => {
        const free = !bookings.some((b) => b.parcelId === p.id && overlaps(from, to, b.arrival, b.departure));
        return {
          ...p,
          free,
          window: free ? freeWindow(p.id, from, to, bookings) : null,
          nextFree: free ? null : freeFrom(p.id, from, to, bookings),
        };
      });
  }, [from, to, typeId, bookings, parcels, nights]);

  const freeCount = results.filter((r) => r.free).length;
  const inp = "border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 bg-white border border-stone-200 rounded-lg p-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{L.arrival}</label>
          <input type="date" className={inp} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{L.departure}</label>
          <input type="date" className={inp} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{L.parcelType}</label>
          <select className={inp} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="all">{L.allTypes}</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-stone-500 pb-1.5">{nights > 0 ? L.availSummary(nights, freeCount) : L.pickRange}</div>
      </div>

      {nights > 0 && (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {results.map((p) => (
            <div
              key={p.id}
              className={"border rounded-lg p-3 flex items-center gap-3 " + (p.free ? "bg-white border-stone-200" : "bg-stone-50 border-stone-100")}
            >
              <span className={"font-mono font-bold text-lg " + (p.free ? "text-stone-700" : "text-stone-400")}>{p.label}</span>
              <div className="text-xs text-stone-500 leading-tight">
                {p.typeName}
                <br />
                {L.upTo(p.capacity)}
                {p.free ? (
                  <span className="block mt-0.5 text-[11px] font-medium text-teal-700">
                    {L.freeText(p.window!.start ? formatDate(p.window!.start) : null, p.window!.end ? formatDate(p.window!.end) : null)}
                  </span>
                ) : p.nextFree ? (
                  <span className="block mt-0.5 text-[11px] font-medium text-stone-400">{L.freeFromLabel(formatDate(p.nextFree))}</span>
                ) : null}
              </div>
              {p.free ? (
                <button
                  onClick={() => onCreate(p.id, from, to)}
                  className="ml-auto shrink-0 text-xs px-2.5 py-1.5 rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900"
                >
                  {L.book}
                </button>
              ) : (
                <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{L.taken}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
