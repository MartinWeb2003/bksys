"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  reorderParcels: (ids: string[]) => Promise<boolean>;
};

const field =
  "border border-transparent hover:border-stone-300 focus:border-cyan-700 rounded px-2 py-1 text-sm bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700/20";
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

function SortableParcelRow({
  p,
  types,
  used,
  L,
  actions,
}: {
  p: ParcelVM;
  types: TypeVM[];
  used: boolean;
  L: Strings;
  actions: ManageActions;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 bg-white">
      <button
        {...attributes}
        {...listeners}
        title={L.dragHandle}
        aria-label={L.dragHandle}
        className="flex-none cursor-grab active:cursor-grabbing touch-none text-stone-300 hover:text-stone-500 px-0.5 leading-none"
      >
        ⠿
      </button>
      <EditableText value={p.label} className={field + " w-14 flex-none font-mono font-bold"} onCommit={(next) => actions.renameParcel(p.id, next)} />
      <select value={p.typeId} onChange={(e) => actions.setParcelType(p.id, e.target.value)} className={field + " flex-1 min-w-[6.5rem]"}>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1 flex-none">
        <CapacityInput value={p.capacity} onCommit={(n) => actions.setParcelCap(p.id, n)} className={field + " w-12"} />
        <span className="text-[10px] text-stone-400">p</span>
      </div>
      <RemoveButton onClick={() => actions.removeParcel(p.id)} disabled={used} title={used ? L.cantRemoveParcel : L.remove} />
    </div>
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

  // Optimistic local order so drag feels instant; re-synced whenever server props change.
  const [ordered, setOrdered] = useState(parcels);
  useEffect(() => setOrdered(parcels), [parcels]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const groups = types.map((t) => ({ type: t, items: ordered.filter((p) => p.typeId === t.id) }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const group = groups.find((g) => g.items.some((i) => i.id === active.id));
    if (!group || !group.items.some((i) => i.id === over.id)) return; // only reorder within the same type
    const oldIndex = group.items.findIndex((i) => i.id === active.id);
    const newIndex = group.items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(group.items, oldIndex, newIndex);
    const fullIds = groups.flatMap((g) => (g.type.id === group.type.id ? newItems : g.items).map((i) => i.id));
    const byId = new Map(ordered.map((p) => [p.id, p]));
    setOrdered(fullIds.map((id) => byId.get(id)!));
    actions.reorderParcels(fullIds);
  }

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
            const inUse = parcels.some((p) => p.typeId === t.id);
            return (
              <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                <EditableText value={t.name} className={field + " w-full font-medium"} onCommit={(next) => actions.renameType(t.id, next)} />
                <RemoveButton onClick={() => actions.removeType(t.id)} disabled={inUse} title={inUse ? L.cantRemoveType : L.remove} />
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

      {/* parcels — grouped by type, drag to reorder within a group */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-2.5">{L.manageParcelsTitle}</h2>
        <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {groups.map((g) => (
              <div key={g.type.id} className="border-t border-stone-200 first:border-t-0">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 bg-stone-50">{g.type.name}</div>
                <SortableContext items={g.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-stone-100">
                    {g.items.map((p) => (
                      <SortableParcelRow key={p.id} p={p} types={types} used={bookings.some((b) => b.parcelId === p.id)} L={L} actions={actions} />
                    ))}
                  </div>
                </SortableContext>
                {g.items.length === 0 && <div className="px-3 py-2 text-xs text-stone-300">—</div>}
              </div>
            ))}
          </DndContext>

          {/* add parcel */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-stone-50 border-t border-stone-200">
            <input
              value={np.label}
              onChange={(e) => setNp({ ...np, label: e.target.value })}
              placeholder={L.idPh}
              className={inp + " w-16 flex-none font-mono"}
            />
            <select value={np.typeId} onChange={(e) => setNp({ ...np, typeId: e.target.value })} className={inp + " flex-1 min-w-[6.5rem]"}>
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
