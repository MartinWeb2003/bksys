"use client";

import { useState } from "react";
import { nightsBetween, formatDate, todayISO } from "@/lib/dates";
import { colorForStatus, statusMeta } from "@/lib/colors";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = bookings
    .filter((b) =>
      (b.guestName + (b.email ?? "") + (b.phone ?? "") + labelOf(b.parcelId)).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.arrival.localeCompare(b.arrival));

  const statusLabel = Object.fromEntries(statusMeta(L).map((m) => [m.status, m.label])) as Record<string, string>;

  function downloadCsv() {
    // Export bookings whose arrival falls in the chosen range (empty = no bound).
    const picked = bookings
      .filter((b) => (!from || b.arrival >= from) && (!to || b.arrival <= to))
      .sort((a, b) => a.arrival.localeCompare(b.arrival));

    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [L.colParcel, L.colGuest, L.colArrival, L.colDeparture, L.colNights, L.colPeople, L.colStatus, L.email, L.phone, L.colReserved, L.colNotes];
    const lines = [
      header.map(esc).join(","),
      ...picked.map((b) =>
        [
          labelOf(b.parcelId),
          b.guestName,
          formatDate(b.arrival),
          formatDate(b.departure),
          nightsBetween(b.arrival, b.departure),
          b.people,
          statusLabel[b.status] ?? b.status,
          b.email ?? "",
          b.phone ?? "",
          formatDate(b.createdAt),
          b.notes ?? "",
        ]
          .map(esc)
          .join(","),
      ),
    ];
    // BOM so Croatian characters render correctly in Excel.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezervacije_${from || "sve"}_${to || "sve"}_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200 whitespace-nowrap";
  const td = "px-3 py-2 border-b border-stone-100 whitespace-nowrap";
  const dateInp = "border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white";
  const dateLbl = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L.searchPh}
          className="w-full max-w-sm border border-stone-300 rounded px-3 py-1.5 text-sm bg-white"
        />
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div>
            <label className={dateLbl}>{L.dlFrom}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInp} />
          </div>
          <div>
            <label className={dateLbl}>{L.dlTo}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInp} />
          </div>
          <button
            onClick={downloadCsv}
            className="px-3 py-1.5 rounded bg-cyan-800 text-white text-sm font-medium hover:bg-cyan-900 whitespace-nowrap"
          >
            {L.download}
          </button>
        </div>
      </div>
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
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colorForStatus(b.status).bg }} />
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
