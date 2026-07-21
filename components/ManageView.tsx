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

const cellInp =
  "w-full border border-transparent hover:border-stone-300 focus:border-cyan-700 rounded px-2 py-1 text-sm bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/20";

function CapacityInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
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
      className={cellInp}
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

  const inp =
    "border border-stone-300 rounded px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";
  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200 whitespace-nowrap";
  const td = "px-3 py-1.5 border-b border-stone-100";

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
                <button
                  onClick={() => actions.removeType(t.id)}
                  disabled={used}
                  title={used ? L.cantRemoveType : ""}
                  className="shrink-0 text-xs text-red-700 hover:underline disabled:text-stone-300 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {L.remove}
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-50">
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder={L.newTypePh}
              className={inp + " flex-1"}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTypeNow();
              }}
            />
            <button onClick={addTypeNow} className="shrink-0 text-xs px-2.5 py-1.5 rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900">
              {L.addType}
            </button>
          </div>
        </div>
      </section>

      {/* parcels */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-2.5">{L.manageParcelsTitle}</h2>
        <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{L.colId}</th>
                <th className={th}>{L.colTypeName}</th>
                <th className={th}>{L.colCapacity}</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const used = bookings.some((b) => b.parcelId === p.id);
                return (
                  <tr key={p.id}>
                    <td className={td + " font-mono font-bold w-24"}>
                      <EditableText value={p.label} className={cellInp} onCommit={(next) => actions.renameParcel(p.id, next)} />
                    </td>
                    <td className={td}>
                      <select value={p.typeId} onChange={(e) => actions.setParcelType(p.id, e.target.value)} className={cellInp}>
                        {types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={td + " w-24"}>
                      <CapacityInput value={p.capacity} onCommit={(n) => actions.setParcelCap(p.id, n)} />
                    </td>
                    <td className={td + " text-right"}>
                      <button
                        onClick={() => actions.removeParcel(p.id)}
                        disabled={used}
                        title={used ? L.cantRemoveParcel : ""}
                        className="text-xs text-red-700 hover:underline disabled:text-stone-300 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {L.remove}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* add row */}
              <tr className="bg-stone-50">
                <td className={td}>
                  <input value={np.label} onChange={(e) => setNp({ ...np, label: e.target.value })} placeholder={L.idPh} className={inp + " w-20 font-mono"} />
                </td>
                <td className={td}>
                  <select value={np.typeId} onChange={(e) => setNp({ ...np, typeId: e.target.value })} className={inp}>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={td}>
                  <input
                    type="number"
                    min="1"
                    value={np.cap}
                    onChange={(e) => setNp({ ...np, cap: Math.max(1, +e.target.value) })}
                    className={inp + " w-16"}
                  />
                </td>
                <td className={td + " text-right"}>
                  <button onClick={addParcelNow} className="text-xs px-2.5 py-1.5 rounded bg-cyan-800 text-white font-medium hover:bg-cyan-900">
                    {L.addParcel}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-400">{L.manageHelp}</p>
      </section>
    </div>
  );
}
