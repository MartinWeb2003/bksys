"use client";

import { useMemo, useState } from "react";
import { nightsBetween, overlaps, formatDate } from "@/lib/dates";
import { statusMeta } from "@/lib/colors";
import type { BookingDTO, BookingStatus, ParcelVM } from "@/lib/types";
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
  status: BookingStatus;
  notes: string;
  createdAt: string;
};

// Searchable parcel picker — a combobox contained inside the modal (its dropdown is
// left-0/right-0 so it can never overflow the form). Filters by parcel label AND type name.
function ParcelSelect({
  parcels,
  value,
  onChange,
  L,
  inputClass,
}: {
  parcels: ParcelVM[];
  value: string;
  onChange: (id: string) => void;
  L: Strings;
  inputClass: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);

  const selected = parcels.find((p) => p.id === value) ?? null;
  const selectedText = selected ? `${selected.label} · ${selected.typeName}` : "";
  const q = query.trim().toLowerCase();
  const filtered = q ? parcels.filter((p) => `${p.label} ${p.typeName}`.toLowerCase().includes(q)) : parcels;

  const pick = (p: ParcelVM) => {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[hi]) {
        e.preventDefault();
        pick(filtered[hi]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={open ? query : selectedText}
        placeholder={selected ? selectedText : L.parcelSearchPh}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHi(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded border border-stone-300 bg-white shadow-lg">
          {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-stone-400">{L.noParcelMatch}</li>}
          {filtered.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                onMouseEnter={() => setHi(i)}
                className={
                  "w-full text-left px-2.5 py-1.5 text-sm flex items-center gap-2 " +
                  (i === hi ? "bg-cyan-50" : "hover:bg-stone-50") +
                  (p.id === value ? " font-semibold" : "")
                }
              >
                <span className="font-mono">{p.label}</span>
                <span className="text-stone-400 text-xs">· {p.typeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
            <ParcelSelect parcels={parcels} value={f.parcelId} onChange={(id) => setF({ ...f, parcelId: id })} L={L} inputClass={inp} />
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
          <div className="col-span-2">
            <label className={lbl}>{L.statusLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {statusMeta(L).map((m) => {
                const active = f.status === m.status;
                return (
                  <button
                    type="button"
                    key={m.status}
                    title={m.desc}
                    onClick={() => setF({ ...f, status: m.status })}
                    className={
                      "flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs text-left " +
                      (active ? "border-stone-800 font-semibold" : "border-stone-200 hover:border-stone-400")
                    }
                    style={active ? { background: m.color.soft } : undefined}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color.bg }} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
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
