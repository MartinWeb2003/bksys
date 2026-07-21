"use client";

import { useState } from "react";
import { nightsBetween, formatDate } from "@/lib/dates";
import { colorForId } from "@/lib/colors";
import type { BookingDTO } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export default function ListView({
  bookings,
  L,
  labelOf,
  onEdit,
}: {
  bookings: BookingDTO[];
  L: Strings;
  labelOf: (parcelId: string) => string;
  onEdit: (b: BookingDTO) => void;
}) {
  const [q, setQ] = useState("");
  const rows = bookings
    .filter((b) =>
      (b.guestName + (b.email ?? "") + (b.phone ?? "") + labelOf(b.parcelId)).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.arrival.localeCompare(b.arrival));

  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200 whitespace-nowrap";
  const td = "px-3 py-2 border-b border-stone-100 whitespace-nowrap";

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={L.searchPh}
        className="mb-3 w-full max-w-sm border border-stone-300 rounded px-3 py-1.5 text-sm bg-white"
      />
      <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}></th>
              <th className={th}>{L.colParcel}</th>
              <th className={th}>{L.colGuest}</th>
              <th className={th}>{L.colArrival}</th>
              <th className={th}>{L.colDeparture}</th>
              <th className={th}>{L.colNights}</th>
              <th className={th}>{L.colPeople}</th>
              <th className={th}>{L.colContact}</th>
              <th className={th}>{L.colReserved}</th>
              <th className={th}>{L.colNotes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} onClick={() => onEdit(b)} className="cursor-pointer hover:bg-cyan-50/50">
                <td className={td}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colorForId(b.id).bg }} />
                </td>
                <td className={td + " font-mono font-bold"}>{labelOf(b.parcelId)}</td>
                <td className={td + " font-medium text-stone-800"}>{b.guestName}</td>
                <td className={td + " font-mono"}>{formatDate(b.arrival)}</td>
                <td className={td + " font-mono"}>{formatDate(b.departure)}</td>
                <td className={td}>{nightsBetween(b.arrival, b.departure)}</td>
                <td className={td}>{b.people}</td>
                <td className={td + " text-stone-500"}>
                  {b.email}
                  <br />
                  {b.phone}
                </td>
                <td className={td + " font-mono text-stone-400"}>{formatDate(b.createdAt)}</td>
                <td className="px-3 py-2 border-b border-stone-100 max-w-[220px] truncate text-stone-500" title={b.notes ?? ""}>
                  {b.notes}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-stone-400">
                  {L.noMatch}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
