"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { addDays, parse, nightsBetween, formatDate, formatShort } from "@/lib/dates";
import { colorForStatus, statusMeta, type Swatch } from "@/lib/colors";
import type { BookingDTO, ParcelVM, TypeVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import { DblClickEdit } from "./inline-edit";

function DroppableCell({
  parcelId,
  date,
  today,
  width,
  onCreate,
}: {
  parcelId: string;
  date: string;
  today: string;
  width: number;
  onCreate: (parcelId: string, date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${parcelId}:${date}`, data: { parcelId, date } });
  const wd = parse(date).getUTCDay();
  return (
    <div
      ref={setNodeRef}
      style={{ width }}
      onClick={() => onCreate(parcelId, date)}
      className={
        "shrink-0 border-r border-stone-100 cursor-pointer hover:bg-cyan-50/60 " +
        (isOver ? "bg-cyan-100" : date === today ? "bg-cyan-50/40" : wd % 6 === 0 ? "bg-stone-50/60" : "")
      }
    />
  );
}

function DraggableBar({
  b,
  color,
  draggable,
  style,
  onEdit,
}: {
  b: BookingDTO;
  color: Swatch;
  draggable: boolean;
  style: React.CSSProperties;
  onEdit: (b: BookingDTO) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bar:${b.id}`,
    data: { booking: b },
    disabled: !draggable,
  });
  const dragTransform = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : null;
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(b);
      }}
      title={`${b.guestName} · ${formatDate(b.arrival)} → ${formatDate(b.departure)} · ${b.people}p`}
      className={
        "absolute rounded-md flex items-center px-2 shadow-sm hover:brightness-110 " +
        (draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer") +
        (isDragging ? " opacity-70 z-30" : "")
      }
      style={{ ...style, background: color.bg, touchAction: draggable ? "none" : undefined, ...dragTransform }}
    >
      <span className="text-[11px] font-medium truncate" style={{ color: color.fg }}>
        {b.guestName} · {b.people}p
      </span>
    </div>
  );
}

export default function CalendarView({
  bookings,
  types,
  parcels,
  today,
  L,
  actions,
  onEdit,
  onCreate,
  onMove,
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
  onMove: (b: BookingDTO, parcelId: string, arrival: string, departure: string) => Promise<boolean>;
}) {
  const [start, setStart] = useState(addDays(today, -6));
  const DAYS = 21,
    W = 46,
    ROW = 40,
    LABEL = 92;
  const days = Array.from({ length: DAYS }, (_, i) => addDays(start, i));

  // Local copy so a drag moves the bar instantly (optimistic); re-synced when server data changes.
  const [localBookings, setLocalBookings] = useState(bookings);
  useEffect(() => setLocalBookings(bookings), [bookings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  async function handleDragEnd(e: DragEndEvent) {
    const b = e.active.data.current?.booking as BookingDTO | undefined;
    const cell = e.over?.data.current as { parcelId: string; date: string } | undefined;
    if (!b || !cell) return;
    const nights = nightsBetween(b.arrival, b.departure);
    const arrival = cell.date;
    const departure = addDays(arrival, nights);
    if (cell.parcelId === b.parcelId && arrival === b.arrival) return; // no change

    // Move the bar immediately, then persist; revert only if the server rejects it (conflict).
    setLocalBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, parcelId: cell.parcelId, arrival, departure } : x)));
    const ok = await onMove(b, cell.parcelId, arrival, departure);
    if (!ok) setLocalBookings((prev) => prev.map((x) => (x.id === b.id ? b : x)));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex-none flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1.5">
          <button onClick={() => setStart(addDays(start, -7))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50 whitespace-nowrap">
            {L.prevWeek}
          </button>
          <button onClick={() => setStart(addDays(today, -6))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50 whitespace-nowrap">
            {L.today}
          </button>
          <button onClick={() => setStart(addDays(start, 7))} className="px-2.5 py-1 rounded border border-stone-300 bg-white text-sm hover:bg-stone-50 whitespace-nowrap">
            {L.nextWeek}
          </button>
        </div>
        <div className="ml-auto text-sm font-mono text-stone-500 whitespace-nowrap">
          {formatDate(days[0])} → {formatDate(days[DAYS - 1])}
        </div>
      </div>

      <div className="flex-1 min-h-0 self-start max-w-full overflow-auto border border-stone-200 rounded-lg bg-white">
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
            <div style={{ width: LABEL + DAYS * W, minWidth: LABEL + DAYS * W }}>
              {/* header */}
              <div className="flex sticky top-0 bg-white border-b border-stone-200 z-20">
                <div style={{ width: LABEL }} className="shrink-0 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-r border-stone-200 bg-white sticky left-0 z-30">
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
                      const rowBookings = localBookings.filter((b) => b.parcelId === p.id && b.arrival < days[DAYS - 1] && b.departure > days[0]);
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
                          {/* droppable empty cells */}
                          {days.map((d) => (
                            <DroppableCell key={d} parcelId={p.id} date={d} today={today} width={W} onCreate={onCreate} />
                          ))}
                          {/* booking bars — midday of arrival to midday of departure; draggable except red (fixed) */}
                          {rowBookings.map((b) => {
                            const c = colorForStatus(b.status);
                            const startIdx = nightsBetween(days[0], b.arrival);
                            const left = LABEL + (startIdx + 0.5) * W;
                            const width = nightsBetween(b.arrival, b.departure) * W;
                            const clipL = Math.max(left, LABEL);
                            const clipR = Math.min(left + width, LABEL + DAYS * W);
                            if (clipR <= clipL) return null;
                            return (
                              <DraggableBar
                                key={b.id}
                                b={b}
                                color={c}
                                draggable={b.status !== "BOOKED_FIXED"}
                                onEdit={onEdit}
                                style={{ left: clipL, width: clipR - clipL, top: 6, height: ROW - 12 }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </DndContext>
      </div>

      {/* status legend at the bottom so the calendar can use full width */}
      <div className="flex-none mt-3 border border-stone-200 rounded-lg bg-white p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">{L.legendTitle}</div>
        <ul className="flex flex-row flex-wrap gap-x-6 gap-y-2">
          {statusMeta(L).map((m) => (
            <li key={m.status} className="flex items-start gap-2">
              <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: m.color.bg }} />
              <div className="leading-tight">
                <div className="text-xs font-medium text-stone-700">{m.label}</div>
                <div className="text-[11px] text-stone-400">{m.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex-none mt-2 text-xs text-stone-400">{L.calHelp}</p>
    </div>
  );
}
