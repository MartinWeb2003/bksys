"use client";

import { formatDate } from "@/lib/dates";
import { colorForStatus } from "@/lib/colors";
import type { BookingDTO } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export default function TodayView({
  bookings,
  today,
  L,
  labelOf,
  onEdit,
}: {
  bookings: BookingDTO[];
  today: string;
  L: Strings;
  labelOf: (parcelId: string) => string;
  onEdit: (b: BookingDTO) => void;
}) {
  const arrivals = bookings.filter((b) => b.arrival === today);
  const departures = bookings.filter((b) => b.departure === today);

  const Card = ({ b, kind }: { b: BookingDTO; kind: "in" | "out" }) => {
    const c = colorForStatus(b.status);
    return (
      <button
        onClick={() => onEdit(b)}
        className="w-full text-left bg-white border border-stone-200 rounded-lg p-3 hover:border-cyan-700/50 hover:shadow-sm transition"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.bg }} />
          <span className="font-semibold text-stone-800">{b.guestName}</span>
          <span className="ml-auto font-mono text-sm font-bold text-stone-600">{labelOf(b.parcelId)}</span>
        </div>
        <div className="mt-1.5 text-xs text-stone-500 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{L.people(b.people)}</span>
          <span>{kind === "in" ? L.until + " " + formatDate(b.departure) : L.since + " " + formatDate(b.arrival)}</span>
          <span>{b.phone}</span>
        </div>
        {b.notes && <div className="mt-1.5 text-xs text-stone-600 bg-stone-50 rounded px-2 py-1">{b.notes}</div>}
      </button>
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-teal-800 mb-2.5">
          {L.arrivingToday} · {arrivals.length}
        </h2>
        <div className="space-y-2">
          {arrivals.length ? arrivals.map((b) => <Card key={b.id} b={b} kind="in" />) : <p className="text-sm text-stone-400">{L.noArrivals}</p>}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-800 mb-2.5">
          {L.departingToday} · {departures.length}
        </h2>
        <div className="space-y-2">
          {departures.length ? departures.map((b) => <Card key={b.id} b={b} kind="out" />) : <p className="text-sm text-stone-400">{L.noDepartures}</p>}
        </div>
      </section>
    </div>
  );
}
