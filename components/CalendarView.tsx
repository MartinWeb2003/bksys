"use client";

import { useState } from "react";
import { addDays, parse, nightsBetween, formatDate, formatShort } from "@/lib/dates";
import { colorForId } from "@/lib/colors";
import type { BookingDTO, ParcelVM, TypeVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import { DblClickEdit } from "./inline-edit";

export default function CalendarView({
  bookings,
  types,
  parcels,
  today,
  L,
  actions,
  onEdit,
  onCreate,
}: {
  bookings: BookingDTO[];
  types: TypeVM[];
  parcels: ParcelVM[];
  today: string;
  L: Strings;
  actions: {
    renameType: (id: string, name: string) => Promise<boolean>;
    renameParcel: (id: string, label: string) => Promise<boolean>;
  };
  onEdit: (b: BookingDTO) => void;
  onCreate: (parcelId: string, date: string) => void;
}) {
  const [start, setStart] = useState(addDays(today, -6));
  const DAYS = 21,
    W = 46,
    ROW = 40,
    LABEL = 92;
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5">
          <button onClick={() => setStart(addDays(start, -7))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50">
            {L.prevWeek}
          </button>
          <button onClick={() => setStart(addDays(today, -6))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50">
            {L.today}
          </button>
          <button onClick={() => setStart(addDays(start, 7))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50">
            {L.nextWeek}
          </button>
        </div>
        <div className="text-sm font-mono text-stone-500">
          {formatDate(days[0])} – {formatDate(days[DAYS - 1])}
        </div>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white">
        <div style={{ width: LABEL + DAYS * W, minWidth: LABEL + DAYS * W }}>
          {/* header */}
          <div className="flex sticky top-0 bg-white border-b border-stone-200 z-10">
            <div style={{ width: LABEL }} className="shrink-0 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-r border-stone-200 bg-white sticky left-0 z-20">
              {L.colParcel}
            </div>
            {days.map((d) => {
              const dt = parse(d),
                wd = dt.getUTCDay(),
                isToday = d === today;
              return (
                <div
                  key={d}
                  style={{ width: W }}
                  className={"shrink-0 text-center py-1 border-r border-stone-100 " + (isToday ? "bg-cyan-800 text-white" : wd === 0 || wd === 6 ? "bg-stone-50" : "")}
                >
                  <div className={"text-[10px] " + (isToday ? "text-cyan-100" : "text-stone-400")}>{L.weekd[wd]}</div>
                  <div className="text-xs font-mono font-semibold">{formatShort(d)}</div>
                </div>
              );
            })}
          </div>

          {/* rows grouped by type */}
          {types.map((type) => (
            <div key={type.id}>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-50 border-b border-stone-200">
                <span className="sticky left-2 inline-block z-10">
                  <DblClickEdit
                    value={type.name}
                    onCommit={(next) => actions.renameType(type.id, next)}
                    editClass="border border-cyan-700 rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-white text-stone-700 focus:outline-none"
                  />
                </span>
              </div>
              {parcels
                .filter((p) => p.typeId === type.id)
                .map((p) => {
                  const rowBookings = bookings.filter((b) => b.parcelId === p.id && b.arrival < days[DAYS - 1] && b.departure > days[0]);
                  return (
                    <div key={p.id} className="flex border-b border-stone-100 relative" style={{ height: ROW }}>
                      <div style={{ width: LABEL }} className="shrink-0 px-2 flex items-center gap-1.5 border-r border-stone-200 bg-white sticky left-0 z-10">
                        <DblClickEdit
                          value={p.label}
                          onCommit={(next) => actions.renameParcel(p.id, next)}
                          display="font-mono font-bold text-sm text-stone-700"
                          editClass="w-14 border border-cyan-700 rounded px-1 py-0.5 font-mono font-bold text-sm bg-white text-stone-700 focus:outline-none"
                        />
                        <span className="text-[10px] text-stone-400">·{p.capacity}p</span>
                      </div>
                      {/* clickable empty cells */}
                      {days.map((d) => (
                        <div
                          key={d}
                          style={{ width: W }}
                          onClick={() => onCreate(p.id, d)}
                          className={
                            "shrink-0 border-r border-stone-100 cursor-pointer hover:bg-cyan-50/60 " +
                            (d === today ? "bg-cyan-50/40" : parse(d).getUTCDay() % 6 === 0 ? "bg-stone-50/60" : "")
                          }
                        />
                      ))}
                      {/* booking bars — midday of arrival to midday of departure */}
                      {rowBookings.map((b) => {
                        const c = colorForId(b.id);
                        const startIdx = nightsBetween(days[0], b.arrival);
                        const left = LABEL + (startIdx + 0.5) * W;
                        const width = nightsBetween(b.arrival, b.departure) * W;
                        const clipL = Math.max(left, LABEL);
                        const clipR = Math.min(left + width, LABEL + DAYS * W);
                        if (clipR <= clipL) return null;
                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(b);
                            }}
                            title={b.guestName + " · " + formatDate(b.arrival) + " → " + formatDate(b.departure) + " · " + b.people + "p"}
                            className="absolute rounded-md flex items-center px-2 cursor-pointer shadow-sm hover:brightness-110"
                            style={{ left: clipL, width: clipR - clipL, top: 6, height: ROW - 12, background: c.bg }}
                          >
                            <span className="text-[11px] font-medium text-white truncate">
                              {b.guestName} · {b.people}p
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-400">{L.calHelp}</p>
    </div>
  );
}
