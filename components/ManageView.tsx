"use client";

import { useEffect, useState } from "react";
import type { BookingDTO, ParcelVM, TypeVM } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import { EditableText } from "./inline-edit";

export type ManageActions = {
  renameType: (id: string, name: string) => Promise<boolean>;
  addType: (name: string) => Promise<boolean>;
  removeType: (id: string) => Promise<boolean>;
  renameParcel: (id: string, label: string) => Promise<boolean>;
  setParcelType: (id: string, typeId: string) => Promise<boolean>;
  setParcelCap: (id: string, cap: number) => Promise<boolean>;
  addParcel: (label: string, typeId: string, cap: number) => Promise<boolean>;
  removeParcel: (id: string) => Promise<boolean>;
};

const field =
  "border border-transparent hover:border-stone-300 focus:border-cyan-700 rounded px-2 py-1 text-sm bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/20";
const cellInp = field + " w-full";
const inp =
  "border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";

function RemoveButton({ onClick, disabled, title }: { onClick: () => void; disabled: boolean; title: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex-none w-6 h-6 flex items-center justify-center rounded text-lg leading-none text-stone-400 hover:text-red-700 hover:bg-red-50 disabled:text-stone-200 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      ×
    </button>
  );
}

function CapacityInput({ value, onCommit, className }: { value: number; onCommit: (n: number) => void; className: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <input
      type="number"
      min="1"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Math.max(1, parseInt(v, 10) || 1);
        if (n !== value) onCommit(n);
        setV(String(n));
      }}
      className={className}
    />
  );
}

export default function ManageView({
  types,
  parcels,
  bookings,
  L,
  actions,
}: {
  types: TypeVM[];
  parcels: ParcelVM[];
  bookings: BookingDTO[];
  L: Strings;
  actions: ManageActions;
}) {
  const [newType, setNewType] = useState("");
  const [np, setNp] = useState({ label: "", typeId: types[0]?.id ?? "", cap: 4 });

  async function addTypeNow() {
    if (await actions.addType(newType.trim())) setNewType("");
  }
  async function addParcelNow() {
    if (np.label.trim() && np.typeId && (await actions.addParcel(np.label.trim(), np.typeId, np.cap))) {
      setNp({ label: "", typeId: types[0]?.id ?? "", cap: 4 });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* types */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-2.5">{L.manageTypesTitle}</h2>
        <div className="border border-stone-200 rounded-lg bg-white divide-y divide-stone-100">
          {types.map((t) => {
            const used = parcels.some((p) => p.typeId === t.id);
            return (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                <EditableText value={t.name} className={cellInp + " font-medium"} onCommit={(next) => actions.renameType(t.id, next)} />
                <RemoveButton onClick={() => actions.removeType(t.id)} disabled={used} title={used ? L.cantRemoveType : L.remove} />
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-50">
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder={L.newTypePh}
              className={inp + " flex-1 min-w-0"}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTypeNow();
              }}
            />
            <button onClick={addTypeNow} className="flex-none text-xs px-2.5 py-1.5 rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900">
              {L.addType}
            </button>
          </div>
        </div>
      </section>

      {/* parcels — wrapping flex rows so everything fits at any width (incl. phones) */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-2.5">{L.manageParcelsTitle}</h2>
        <div className="border border-stone-200 rounded-lg bg-white divide-y divide-stone-100">
          {parcels.map((p) => {
            const used = bookings.some((b) => b.parcelId === p.id);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
                <EditableText
                  value={p.label}
                  className={field + " w-16 flex-none font-mono font-bold"}
                  onCommit={(next) => actions.renameParcel(p.id, next)}
                />
                <select value={p.typeId} onChange={(e) => actions.setParcelType(p.id, e.target.value)} className={field + " flex-1 min-w-[7rem]"}>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 flex-none">
                  <CapacityInput value={p.capacity} onCommit={(n) => actions.setParcelCap(p.id, n)} className={field + " w-14"} />
                  <span className="text-[10px] text-stone-400">p</span>
                </div>
                <RemoveButton onClick={() => actions.removeParcel(p.id)} disabled={used} title={used ? L.cantRemoveParcel : L.remove} />
              </div>
            );
          })}
          {/* add parcel */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-stone-50">
            <input
              value={np.label}
              onChange={(e) => setNp({ ...np, label: e.target.value })}
              placeholder={L.idPh}
              className={inp + " w-16 flex-none font-mono"}
            />
            <select value={np.typeId} onChange={(e) => setNp({ ...np, typeId: e.target.value })} className={inp + " flex-1 min-w-[7rem]"}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 flex-none">
              <input
                type="number"
                min="1"
                value={np.cap}
                onChange={(e) => setNp({ ...np, cap: Math.max(1, +e.target.value) })}
                className={inp + " w-14"}
              />
              <span className="text-[10px] text-stone-400">p</span>
            </div>
            <button onClick={addParcelNow} className="flex-none text-xs px-2.5 py-1.5 rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900">
              {L.addParcel}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-400">{L.manageHelp}</p>
      </section>
    </div>
  );
}
