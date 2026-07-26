"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, todayISO, formatDate, overlaps } from "@/lib/dates";
import { makeStrings, DEFAULT_LANG, type Lang } from "@/lib/i18n";
import type { UnitNoun } from "@/lib/vocab";
import type { BookingDTO, NoteDTO, ParcelVM, TypeVM } from "@/lib/types";
import CalendarView from "./CalendarView";
import TodayView from "./TodayView";
import AvailabilityView from "./AvailabilityView";
import ListView from "./ListView";
import UnconfirmedView from "./UnconfirmedView";
import NotesView, { type NoteActions } from "./NotesView";
import ManageView, { type ManageActions } from "./ManageView";
import BookingForm, { type BookingFormState } from "./BookingForm";

type View = "calendar" | "today" | "availability" | "list" | "unconfirmed" | "notes" | "manage";

export default function Dashboard({
  initialBookings,
  initialParcels,
  initialTypes,
  initialNotes,
  unitNoun,
}: {
  initialBookings: BookingDTO[];
  initialParcels: ParcelVM[];
  initialTypes: TypeVM[];
  initialNotes: NoteDTO[];
  unitNoun: UnitNoun;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [view, setView] = useState<View>("calendar");
  const [modal, setModal] = useState<BookingFormState | null>(null);
  // Dictionary is relabeled with the camp's unit noun (parcel/apartment/room/…).
  const L = useMemo(() => makeStrings(lang, unitNoun), [lang, unitNoun]);

  // Data comes straight from server props; mutations call router.refresh() to re-read.
  const bookings = initialBookings;
  const parcels = initialParcels;
  const types = initialTypes;
  const notes = initialNotes;

  // Confirmed bookings live on the calendar/lists; unconfirmed (tentative) ones only on Nepotvrđeno.
  const confirmedBookings = useMemo(() => bookings.filter((b) => b.confirmed), [bookings]);
  const unconfirmedBookings = useMemo(() => bookings.filter((b) => !b.confirmed), [bookings]);

  // A tentative booking's clash (if any) is measured only against CONFIRMED bookings — those are
  // the ones that hold a slot. Used to warn on the Unconfirmed list and block confirming.
  const conflictFor = (b: BookingDTO): BookingDTO | null =>
    confirmedBookings.find((c) => c.id !== b.id && c.parcelId === b.parcelId && overlaps(b.arrival, b.departure, c.arrival, c.departure)) ?? null;

  const today = useMemo(() => todayISO(), []);
  const labelById = useMemo(() => new Map(parcels.map((p) => [p.id, p.label])), [parcels]);
  const labelOf = (id: string) => labelById.get(id) ?? id;

  const blank = (parcelId = "", arrival = today, departure = "", confirmed = true): BookingFormState => ({
    id: null,
    parcelId,
    guestName: "",
    email: "",
    phone: "",
    arrival,
    departure: departure || addDays(arrival, 7),
    people: 2,
    status: "BOOKED_MOVABLE",
    confirmed,
    notes: "",
    createdAt: today,
  });

  const toForm = (b: BookingDTO): BookingFormState => ({
    id: b.id,
    parcelId: b.parcelId,
    guestName: b.guestName,
    email: b.email ?? "",
    phone: b.phone ?? "",
    arrival: b.arrival,
    departure: b.departure,
    people: b.people,
    status: b.status,
    confirmed: b.confirmed,
    notes: b.notes ?? "",
    createdAt: b.createdAt,
  });

  async function api(url: string, method: string, body?: unknown): Promise<boolean> {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) router.refresh();
    return res.ok;
  }

  const payloadOf = (b: {
    parcelId: string;
    guestName: string;
    email: string | null;
    phone: string | null;
    arrival: string;
    departure: string;
    people: number;
    status: BookingDTO["status"];
    confirmed: boolean;
    notes: string | null;
  }) => ({
    parcelId: b.parcelId,
    guestName: b.guestName,
    email: b.email,
    phone: b.phone,
    arrival: b.arrival,
    departure: b.departure,
    people: b.people,
    status: b.status,
    confirmed: b.confirmed,
    notes: b.notes,
  });

  async function saveBooking(f: BookingFormState): Promise<boolean> {
    const ok = await api(f.id ? `/api/bookings/${f.id}` : "/api/bookings", f.id ? "PATCH" : "POST", payloadOf(f));
    if (ok) setModal(null);
    return ok;
  }

  async function deleteBooking(id: string) {
    await api(`/api/bookings/${id}`, "DELETE");
    setModal(null);
  }

  // One-click confirm from the Nepotvrđeno list. A tentative booking that clashes with a confirmed
  // one may NOT be confirmed — the list disables the button, and the server re-checks as a backstop.
  // If the server still rejects (race), open the editor so the clash can be resolved.
  async function confirmBooking(b: BookingDTO) {
    if (conflictFor(b)) return;
    const ok = await api(`/api/bookings/${b.id}`, "PATCH", payloadOf({ ...b, confirmed: true }));
    if (!ok) setModal(toForm(b));
  }

  const noteActions: NoteActions = {
    createNote: (title, body) => api("/api/notes", "POST", { title, body }),
    updateNote: (id, title, body) => api(`/api/notes/${id}`, "PATCH", { title, body }),
    deleteNote: (id) => api(`/api/notes/${id}`, "DELETE"),
  };

  // Calendar drag: move a booking to a new parcel/date, preserving nights. Conflicts are rejected by the server.
  function moveBooking(b: BookingDTO, parcelId: string, arrival: string, departure: string): Promise<boolean> {
    return api(`/api/bookings/${b.id}`, "PATCH", payloadOf({ ...b, parcelId, arrival, departure }));
  }

  const actions: ManageActions & {
    renameType: (id: string, name: string) => Promise<boolean>;
    renameParcel: (id: string, label: string) => Promise<boolean>;
  } = {
    renameType: (id, name) => api(`/api/types/${id}`, "PATCH", { name }),
    addType: (name) => (name ? api("/api/types", "POST", { name, order: types.length }) : Promise.resolve(false)),
    removeType: (id) => api(`/api/types/${id}`, "DELETE"),
    renameParcel: (id, label) => api(`/api/parcels/${id}`, "PATCH", { label }),
    setParcelType: (id, typeId) => api(`/api/parcels/${id}`, "PATCH", { typeId }),
    setParcelCap: (id, cap) => api(`/api/parcels/${id}`, "PATCH", { capacity: cap }),
    addParcel: (label, typeId, cap) => api("/api/parcels", "POST", { label, typeId, capacity: cap, order: parcels.length }),
    removeParcel: (id) => api(`/api/parcels/${id}`, "DELETE"),
    reorderParcels: (ids) => api("/api/parcels/reorder", "POST", { ids }),
  };

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const tabs: [View, string][] = [
    ["calendar", L.tab_calendar],
    ["today", L.tab_today],
    ["availability", L.tab_availability],
    ["list", L.tab_list],
    ["unconfirmed", L.tab_unconfirmed],
    ["notes", L.tab_notes],
    ["manage", L.tab_manage],
  ];

  const onEdit = (b: BookingDTO) => setModal(toForm(b));

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1 className="text-lg font-bold tracking-tight">
              Camp desk<span className="text-cyan-700">.</span>
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-sm font-mono text-stone-500">
                {formatDate(today)} · {L.bookingsCount(bookings.length)}
              </div>
              <button
                onClick={() => setLang(lang === "hr" ? "en" : "hr")}
                className="px-2 py-0.5 text-xs font-bold rounded border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                {L.langOther}
              </button>
              <button onClick={logout} className="px-2 py-0.5 text-xs font-medium rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
                {L.logout}
              </button>
            </div>
          </div>
          <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={
                  "px-3.5 py-2 text-sm font-medium rounded-t-md border-b-2 whitespace-nowrap " +
                  (view === k ? "border-cyan-700 text-cyan-800 bg-stone-100" : "border-transparent text-stone-500 hover:text-stone-800")
                }
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setModal(blank())}
              className="ml-auto my-1.5 px-3.5 py-1 text-sm font-medium rounded bg-cyan-800 text-white hover:bg-cyan-900 whitespace-nowrap"
            >
              {L.newBooking}
            </button>
          </nav>
        </div>
      </header>

      <main className={(view === "list" ? "max-w-none" : view === "calendar" ? "max-w-7xl" : "max-w-6xl") + " mx-auto px-4 py-5"}>
        {view === "calendar" && (
          <CalendarView
            bookings={confirmedBookings}
            types={types}
            parcels={parcels}
            today={today}
            L={L}
            actions={actions}
            onEdit={onEdit}
            onCreate={(p, d) => setModal(blank(p, d))}
            onMove={moveBooking}
          />
        )}
        {view === "today" && <TodayView bookings={confirmedBookings} today={today} L={L} labelOf={labelOf} onEdit={onEdit} />}
        {view === "availability" && (
          <AvailabilityView bookings={confirmedBookings} types={types} parcels={parcels} today={today} L={L} onCreate={(p, a, d) => setModal(blank(p, a, d))} />
        )}
        {view === "list" && <ListView bookings={confirmedBookings} L={L} labelOf={labelOf} onEdit={onEdit} />}
        {view === "unconfirmed" && (
          <UnconfirmedView
            bookings={unconfirmedBookings}
            L={L}
            labelOf={labelOf}
            conflictFor={conflictFor}
            onEdit={onEdit}
            onConfirm={confirmBooking}
            onCreate={() => setModal(blank("", today, "", false))}
          />
        )}
        {view === "notes" && <NotesView notes={notes} L={L} lang={lang} actions={noteActions} />}
        {view === "manage" && <ManageView types={types} parcels={parcels} bookings={bookings} L={L} actions={actions} />}
      </main>

      {modal && (
        <BookingForm
          initial={modal}
          bookings={bookings}
          parcels={parcels}
          L={L}
          labelOf={labelOf}
          onSave={saveBooking}
          onDelete={deleteBooking}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
