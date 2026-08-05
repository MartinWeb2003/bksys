"use client";

import { useState } from "react";
import type { ParcelVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export type EvisitorFormState = {
  id: string | null;
  parcelId: string;
  adults: number;
  c1218: number;
  c512: number;
  c05: number;
  departure: string;
};

// Searchable parcel picker (filters by label + type name), self-contained for this modal.
function ParcelPicker({
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
  const selected = parcels.find((p) => p.id === value) ?? null;
  const selectedText = selected ? `${selected.label} · ${selected.typeName}` : "";
  const q = query.trim().toLowerCase();
  const filtered = q ? parcels.filter((p) => `${p.label} ${p.typeName}`.toLowerCase().includes(q)) : parcels;

  return (
    <div className="relative">
      <input
        className={inputClass}
        value={open ? query : selectedText}
        placeholder={selected ? selectedText : L.parcelSearchPh}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        role="combobox"
        aria-expanded={open}
      />
      {open && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded border border-stone-300 bg-white shadow-lg">
          {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-stone-400">{L.noParcelMatch}</li>}
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className={"w-full text-left px-2.5 py-1.5 text-sm flex items-center gap-2 hover:bg-stone-50" + (p.id === value ? " font-semibold" : "")}
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

export default function EvisitorForm({
  initial,
  parcels,
  L,
  onSave,
  onDelete,
  onClose,
}: {
  initial: EvisitorFormState;
  parcels: ParcelVM[];
  L: Strings;
  onSave: (f: EvisitorFormState) => Promise<boolean>;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<EvisitorFormState>(initial);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const total = f.adults + f.c1218 + f.c512 + f.c05;
  const valid = !!f.parcelId && !!f.departure && total >= 1;

  const num = (k: "adults" | "c1218" | "c512" | "c05") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) });

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

  const bands: [string, "adults" | "c1218" | "c512" | "c05"][] = [
    [L.evAdults, "adults"],
    [L.evC1218, "c1218"],
    [L.evC512, "c512"],
    [L.evC05, "c05"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-3" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-bold text-stone-800">{f.id ? L.evEditTitle : L.evNewTitle}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3.5">
          <div>
            <label className={lbl}>{L.colParcel}</label>
            <ParcelPicker parcels={parcels} value={f.parcelId} onChange={(id) => setF({ ...f, parcelId: id })} L={L} inputClass={inp} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {bands.map(([label, key]) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <input type="number" min="0" className={inp + " px-1.5 text-center"} value={f[key]} onChange={num(key)} />
              </div>
            ))}
          </div>
          <div>
            <label className={lbl}>{L.evDeparture}</label>
            <input type="date" className={inp} value={f.departure} onChange={(e) => setF({ ...f, departure: e.target.value })} />
          </div>
          {saveError && <p className="text-xs text-red-700 font-medium">{L.saveFailed}</p>}
        </div>
        <div className="px-5 py-3.5 border-t border-stone-200 flex justify-between">
          {f.id ? (
            <button onClick={() => onDelete(f.id!)} className="text-sm text-red-700 hover:underline">
              {L.noteDelete}
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
              {L.noteSave}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
