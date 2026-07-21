"use client";

import { useMemo, useState } from "react";
import { nightsBetween, overlaps, formatDate } from "@/lib/dates";
import type { BookingDTO, ParcelVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export type BookingFormState = {
  id: string | null;
  parcelId: string;
  guestName: string;
  email: string;
  phone: string;
  arrival: string;
  departure: string;
  people: number;
  notes: string;
  createdAt: string;
};

export default function BookingForm({
  initial,
  bookings,
  parcels,
  L,
  labelOf,
  onSave,
  onDelete,
  onClose,
}: {
  initial: BookingFormState;
  bookings: BookingDTO[];
  parcels: ParcelVM[];
  L: Strings;
  labelOf: (parcelId: string) => string;
  onSave: (f: BookingFormState) => Promise<boolean>;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<BookingFormState>(initial);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const set = (k: keyof BookingFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const nights = f.arrival && f.departure ? nightsBetween(f.arrival, f.departure) : 0;
  const conflict = useMemo(() => {
    if (!f.parcelId || !f.arrival || !f.departure || nights <= 0) return null;
    return (
      bookings.find(
        (b) => b.id !== f.id && b.parcelId === f.parcelId && overlaps(f.arrival, f.departure, b.arrival, b.departure),
      ) || null
    );
  }, [f, bookings, nights]);
  const valid = f.guestName.trim() && f.parcelId && nights > 0 && !conflict;

  async function submit() {
    setBusy(true);
    setSaveError(false);
    const ok = await onSave(f);
    if (!ok) {
      setSaveError(true);
      setBusy(false);
    }
  }

  const inp =
    "w-full border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";
  const lbl = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-bold text-stone-800">{f.id ? L.editBooking : L.newBookingTitle}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3.5">
          <div className="col-span-2">
            <label className={lbl}>{L.guestName}</label>
            <input className={inp} value={f.guestName} onChange={set("guestName")} placeholder={L.phFullName} />
          </div>
          <div>
            <label className={lbl}>{L.email}</label>
            <input className={inp} value={f.email} onChange={set("email")} placeholder={L.phMail} />
          </div>
          <div>
            <label className={lbl}>{L.phone}</label>
            <input className={inp} value={f.phone} onChange={set("phone")} placeholder={L.phPhone} />
          </div>
          <div>
            <label className={lbl}>{L.parcel}</label>
            <select className={inp} value={f.parcelId} onChange={set("parcelId")}>
              <option value="">{L.choose}</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.typeName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>{L.peopleLbl}</label>
            <input type="number" min="1" className={inp} value={f.people} onChange={(e) => setF({ ...f, people: +e.target.value })} />
          </div>
          <div>
            <label className={lbl}>{L.arrival}</label>
            <input type="date" className={inp} value={f.arrival} onChange={set("arrival")} />
          </div>
          <div>
            <label className={lbl}>{L.departure}</label>
            <input type="date" className={inp} value={f.departure} onChange={set("departure")} />
          </div>
          <div className="col-span-2 text-xs text-stone-500 -mt-1">
            {nights > 0 ? L.nights(nights) : L.mustAfter}
            {conflict && (
              <span className="block mt-1 text-red-700 font-medium">
                {L.conflict(conflict.guestName, labelOf(f.parcelId), formatDate(conflict.arrival), formatDate(conflict.departure))}
              </span>
            )}
            {saveError && <span className="block mt-1 text-red-700 font-medium">{L.saveFailed}</span>}
          </div>
          <div className="col-span-2">
            <label className={lbl}>{L.extraInfo}</label>
            <textarea className={inp + " min-h-[70px]"} value={f.notes} onChange={set("notes")} placeholder={L.phNotes} />
          </div>
          <div className="col-span-2 text-[11px] text-stone-400">{L.reservedOn(formatDate(f.createdAt))}</div>
        </div>
        <div className="px-5 py-3.5 border-t border-stone-200 flex justify-between">
          {f.id ? (
            <button onClick={() => onDelete(f.id!)} className="text-sm text-red-700 hover:underline">
              {L.deleteBooking}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3.5 py-1.5 text-sm rounded border border-stone-300 hover:bg-stone-50">
              {L.cancel}
            </button>
            <button
              disabled={!valid || busy}
              onClick={submit}
              className="px-4 py-1.5 text-sm rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {L.saveBooking}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
