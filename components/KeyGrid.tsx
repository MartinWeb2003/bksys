"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyColumn, KeyGridData } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const namedCells = (label: string, n: number) => Array.from({ length: n }, (_, i) => ({ name: `${label}${i + 1}`, value: "" }));

// The starting layout when a camp has never saved a grid: 10 fridge keys (F), 20 adapters (A).
const defaultGrid = (): KeyGridData => ({
  enabled: true,
  columns: [
    { id: uid(), label: "F", cells: namedCells("F", 10) },
    { id: uid(), label: "A", cells: namedCells("A", 20) },
  ],
});

export default function KeyGrid({ initial, L }: { initial: KeyGridData | null; L: Strings }) {
  const seed = initial ?? defaultGrid();
  const [enabled, setEnabled] = useState<boolean>(seed.enabled);
  const [columns, setColumns] = useState<KeyColumn[]>(seed.columns);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist the whole grid, debounced so typing doesn't fire a request per keystroke.
  function persist(next: { enabled: boolean; columns: KeyColumn[] }) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/keygrid", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    }, 600);
  }

  // If the camp had no saved grid, write the seeded default once so it survives a reload.
  useEffect(() => {
    if (initial === null) persist({ enabled, columns });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (nextEnabled: boolean, nextColumns: KeyColumn[]) => {
    setEnabled(nextEnabled);
    setColumns(nextColumns);
    persist({ enabled: nextEnabled, columns: nextColumns });
  };
  const commitCols = (next: KeyColumn[]) => commit(enabled, next);
  const toggle = () => commit(!enabled, columns);

  const setColLabel = (ci: number, label: string) => commitCols(columns.map((c, i) => (i === ci ? { ...c, label } : c)));
  const setCellName = (ci: number, ri: number, name: string) =>
    commitCols(columns.map((c, i) => (i === ci ? { ...c, cells: c.cells.map((x, j) => (j === ri ? { ...x, name } : x)) } : c)));
  const setCellValue = (ci: number, ri: number, value: string) =>
    commitCols(columns.map((c, i) => (i === ci ? { ...c, cells: c.cells.map((x, j) => (j === ri ? { ...x, value } : x)) } : c)));
  const addColumn = () => commitCols([...columns, { id: uid(), label: "", cells: [{ name: "1", value: "" }] }]);
  const removeColumn = (ci: number) => commitCols(columns.filter((_, i) => i !== ci));
  const addRow = (ci: number) =>
    commitCols(columns.map((c, i) => (i === ci ? { ...c, cells: [...c.cells, { name: `${c.label}${c.cells.length + 1}`, value: "" }] } : c)));
  const removeRow = (ci: number) => commitCols(columns.map((c, i) => (i === ci ? { ...c, cells: c.cells.slice(0, -1) } : c)));

  const cellInp =
    "w-full border border-stone-300 rounded px-1.5 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/30 focus:border-cyan-700";

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3 mb-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-800">{L.keyTrackerTitle}</h3>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-stone-500">{L.keyToggle}</span>
          <input type="checkbox" checked={enabled} onChange={toggle} className="w-4 h-4 accent-cyan-800" />
        </label>
      </div>

      {enabled && (
        <>
          <div className="flex items-baseline justify-between gap-3 mt-1 mb-3">
            <p className="text-[11px] text-stone-400 max-w-2xl">{L.keyTrackerHelp}</p>
            <button onClick={addColumn} className="flex-none text-xs font-medium text-cyan-800 hover:underline whitespace-nowrap">
              {L.keyAddColumn}
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {columns.map((col, ci) => (
              <div key={col.id} className="flex-none w-44 rounded-lg border border-stone-200 bg-stone-50/50 p-2">
                <div className="flex items-center gap-1 mb-2">
                  <input
                    value={col.label}
                    onChange={(e) => setColLabel(ci, e.target.value)}
                    placeholder={L.keyColLabelPh}
                    className="w-full font-bold text-sm text-stone-800 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-cyan-700 focus:outline-none px-0.5"
                  />
                  <button
                    onClick={() => removeColumn(ci)}
                    title={L.keyRemoveColumn}
                    className="flex-none text-stone-400 hover:text-red-600 text-lg leading-none px-1"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-1">
                  {col.cells.map((cell, ri) => (
                    <div key={ri} className="flex items-center gap-1">
                      <input
                        value={cell.name}
                        onChange={(e) => setCellName(ci, ri, e.target.value)}
                        placeholder={L.keyRowNamePh}
                        className="flex-none w-10 font-mono text-[11px] text-stone-600 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-cyan-700 focus:outline-none px-0.5"
                      />
                      <input
                        value={cell.value}
                        onChange={(e) => setCellValue(ci, ri, e.target.value)}
                        placeholder={L.colParcel}
                        className={cellInp}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">{L.keyColItems(col.cells.length)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => removeRow(ci)}
                      disabled={col.cells.length === 0}
                      title={L.keyRemoveRow}
                      className="px-1.5 text-sm text-stone-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <button onClick={() => addRow(ci)} className="text-[11px] font-medium text-cyan-800 hover:underline">
                      {L.keyAddRow}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
