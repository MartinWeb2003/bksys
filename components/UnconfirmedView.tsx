"use client";

import { nightsBetween, formatDate } from "@/lib/dates";
import { colorForStatus } from "@/lib/colors";
import type { BookingDTO } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export default function UnconfirmedView({
  bookings,
  L,
  labelOf,
  conflictFor,
  onEdit,
  onConfirm,
  onCreate,
}: {
  bookings: BookingDTO[];
  L: Strings;
  labelOf: (parcelId: string) => string;
  conflictFor: (b: BookingDTO) => BookingDTO | null;
  onEdit: (b: BookingDTO) => void;
  onConfirm: (b: BookingDTO) => void;
  onCreate: () => void;
}) {
  const rows = [...bookings].sort((a, b) => a.arrival.localeCompare(b.arrival));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs text-stone-500 max-w-xl">{L.unconfirmedHelp}</p>
        <button
          onClick={onCreate}
          className="flex-none px-3 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 whitespace-nowrap"
        >
          {L.addUnconfirmed}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">{L.noUnconfirmed}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map((b) => {
            const c = colorForStatus(b.status);
            const clash = conflictFor(b);
            return (
              <div
                key={b.id}
                onClick={() => onEdit(b)}
                className={
                  "bg-white border rounded-lg p-3 hover:shadow-sm transition cursor-pointer " +
                  (clash ? "border-amber-400 hover:border-amber-500" : "border-stone-200 hover:border-cyan-700/50")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.bg }} />
                  <span className="font-semibold text-stone-800">{b.guestName}</span>
                  <span className="ml-auto font-mono text-sm font-bold text-stone-600">{labelOf(b.parcelId)}</span>
                </div>
                <div className="mt-1.5 text-xs text-stone-500 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>
                    {formatDate(b.arrival)} → {formatDate(b.departure)}
                  </span>
                  <span>
                    {nightsBetween(b.arrival, b.departure)} · {b.people}p
                  </span>
                  {b.phone && <span>{b.phone}</span>}
                  {b.email && <span>{b.email}</span>}
                </div>
                {b.notes && <div className="mt-1.5 text-xs text-stone-600 bg-stone-50 rounded px-2 py-1">{b.notes}</div>}
                {clash && (
                  <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    ⚠ {L.conflict(clash.guestName, labelOf(b.parcelId), formatDate(clash.arrival), formatDate(clash.departure))}
                  </div>
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    disabled={!!clash}
                    title={clash ? L.cantConfirmConflict : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirm(b);
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {L.confirmBtn}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
