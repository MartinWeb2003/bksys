// Centralized, tenant-scoped DB access. EVERY read/write is filtered by campId — this
// is the single place isolation is enforced, so no route or component can leak across camps.

import crypto from "crypto";
import { prisma } from "./prisma";
import { overlaps, fromDbDate, toDbDate } from "./dates";
import { DEFAULT_TYPES, DEFAULT_PARCELS } from "./defaults";
import { type BusinessKindKey, type UnitNoun, kindByKey, resolveUnitNoun } from "./vocab";
import type { Lang } from "./i18n";
import type { BookingDTO, BookingStatus, NoteDTO } from "./types";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const STATUSES: BookingStatus[] = ["PAID", "HERE_UNPAID", "BOOKED_FIXED", "BOOKED_MOVABLE"];

const toBookingDTO = (b: {
  id: string;
  parcelId: string;
  guestName: string;
  email: string | null;
  phone: string | null;
  arrival: Date;
  departure: Date;
  people: number;
  status: string;
  confirmed: boolean;
  notes: string | null;
  createdAt: Date;
}): BookingDTO => ({
  id: b.id,
  parcelId: b.parcelId,
  guestName: b.guestName,
  email: b.email,
  phone: b.phone,
  arrival: fromDbDate(b.arrival),
  departure: fromDbDate(b.departure),
  people: b.people,
  status: b.status as BookingStatus,
  confirmed: b.confirmed,
  notes: b.notes,
  createdAt: fromDbDate(b.createdAt),
});

// ---------- errors ----------

export class ConflictError extends Error {
  constructor(public conflict: BookingDTO) {
    super("Booking conflicts with an existing booking on this parcel.");
  }
}
export class InUseError extends Error {}
export class NotFoundError extends Error {}
export class AlreadyOnboardedError extends Error {}
export class InvalidOnboardingError extends Error {}

// ---------- camps / auth ----------

export function findCampByEmail(email: string) {
  return prisma.camp.findUnique({ where: { email: email.toLowerCase() } });
}

/** Create a camp with NO layout, pending onboarding (onboardedAt stays null).
 *  The first-login onboarding flow generates the types/parcels via completeOnboarding. */
export function createCamp(name: string, email: string, passwordHash: string) {
  return prisma.camp.create({ data: { name, email: email.toLowerCase(), passwordHash } });
}

/** Onboarding status + resolved vocabulary for a camp. Drives the /onboarding gate and
 *  the app-wide relabeling (unitNoun). */
export async function getCampProfile(campId: string) {
  const camp = await prisma.camp.findUnique({
    where: { id: campId },
    select: { name: true, onboardedAt: true, unitNoun: true, businessKinds: true },
  });
  if (!camp) throw new NotFoundError("Camp not found.");
  return {
    name: camp.name,
    onboardedAt: camp.onboardedAt,
    unitNoun: camp.unitNoun as UnitNoun,
    businessKinds: camp.businessKinds,
  };
}

export type OnboardingSelection = { kind: BusinessKindKey; count: number; capacity: number };

const MAX_UNITS_PER_KIND = 300;

/** Complete first-login onboarding: turn the admin's chosen business kinds + counts into
 *  ParcelTypes and Parcels, and record the resolved unit noun. Idempotency is enforced —
 *  a camp that is already onboarded is rejected. Runs atomically. */
export async function completeOnboarding(campId: string, selections: OnboardingSelection[], lang: Lang) {
  const clean = selections.filter((s) => kindByKey(s.kind) && s.count > 0);
  if (clean.length === 0) throw new InvalidOnboardingError("Pick at least one thing to manage.");
  // Dedupe kinds — each kind maps to exactly one ParcelType.
  const seen = new Set<string>();
  for (const s of clean) {
    if (seen.has(s.kind)) throw new InvalidOnboardingError("Duplicate category.");
    seen.add(s.kind);
    if (s.count > MAX_UNITS_PER_KIND) throw new InvalidOnboardingError(`At most ${MAX_UNITS_PER_KIND} per category.`);
    if (!(s.capacity > 0)) throw new InvalidOnboardingError("Capacity must be at least 1.");
  }

  const kinds = clean.map((s) => s.kind);

  return prisma.$transaction(async (tx) => {
    // Guard: only a not-yet-onboarded camp may run this (prevents double-seeding).
    const camp = await tx.camp.findUnique({ where: { id: campId }, select: { onboardedAt: true } });
    if (!camp) throw new NotFoundError("Camp not found.");
    if (camp.onboardedAt) throw new AlreadyOnboardedError("Camp is already set up.");

    let parcelOrder = 0;
    for (let i = 0; i < clean.length; i++) {
      const sel = clean[i];
      const kind = kindByKey(sel.kind)!;
      const type = await tx.parcelType.create({
        data: { campId, name: kind.typeName[lang], order: i },
      });
      for (let n = 1; n <= sel.count; n++) {
        await tx.parcel.create({
          data: { campId, label: `${kind.labelPrefix}${n}`, typeId: type.id, capacity: sel.capacity, order: parcelOrder++ },
        });
      }
    }

    await tx.camp.update({
      where: { id: campId },
      data: { unitNoun: resolveUnitNoun(kinds), businessKinds: kinds.join(","), onboardedAt: new Date() },
    });
  });
}

/** Create a camp and seed it with the default parcel layout, atomically. */
export async function createCampWithDefaults(name: string, email: string, passwordHash: string) {
  return prisma.$transaction(async (tx) => {
    const camp = await tx.camp.create({ data: { name, email: email.toLowerCase(), passwordHash } });

    const typeIdByName = new Map<string, string>();
    for (const t of DEFAULT_TYPES) {
      const ct = await tx.parcelType.create({ data: { campId: camp.id, name: t.name, order: t.order } });
      typeIdByName.set(t.name, ct.id);
    }
    let order = 0;
    for (const p of DEFAULT_PARCELS) {
      await tx.parcel.create({
        data: { campId: camp.id, label: p.label, typeId: typeIdByName.get(p.type)!, capacity: p.capacity, order: order++ },
      });
    }
    return camp;
  });
}

// ---------- password reset ----------

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Create a reset token for the account with this email (if any). Returns the RAW token
 * (only the sha256 hash is stored) plus the camp, or null if no such account. */
export async function createPasswordReset(email: string): Promise<{ camp: { id: string; email: string }; rawToken: string } | null> {
  const camp = await findCampByEmail(email);
  if (!camp) return null;
  const rawToken = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordReset.create({
    data: { campId: camp.id, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return { camp: { id: camp.id, email: camp.email }, rawToken };
}

/** Consume a reset token and set the new password hash. Returns false if invalid/expired/used. */
export async function resetPasswordWithToken(rawToken: string, newPasswordHash: string): Promise<boolean> {
  const pr = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(rawToken) } });
  if (!pr || pr.usedAt || pr.expiresAt < new Date()) return false;
  await prisma.$transaction([
    prisma.camp.update({ where: { id: pr.campId }, data: { passwordHash: newPasswordHash } }),
    prisma.passwordReset.update({ where: { id: pr.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}

// ---------- reads (all scoped by campId) ----------

export function listParcelTypes(campId: string) {
  return prisma.parcelType.findMany({ where: { campId }, orderBy: { order: "asc" } });
}

export function listParcels(campId: string) {
  return prisma.parcel.findMany({ where: { campId }, orderBy: { order: "asc" }, include: { type: true } });
}

export async function listBookings(campId: string): Promise<BookingDTO[]> {
  const rows = await prisma.booking.findMany({ where: { campId }, orderBy: { arrival: "asc" } });
  return rows.map(toBookingDTO);
}

// ---------- ownership guards ----------

async function ownParcel(campId: string, parcelId: string) {
  const p = await prisma.parcel.findFirst({ where: { id: parcelId, campId } });
  if (!p) throw new NotFoundError("Parcel not found.");
  return p;
}
async function ownType(campId: string, typeId: string) {
  const t = await prisma.parcelType.findFirst({ where: { id: typeId, campId } });
  if (!t) throw new NotFoundError("Parcel type not found.");
  return t;
}
async function ownBooking(campId: string, id: string) {
  const b = await prisma.booking.findFirst({ where: { id, campId } });
  if (!b) throw new NotFoundError("Booking not found.");
  return b;
}

// ---------- booking writes (server re-validates the overlap rule — never trust the client) ----------

// Only CONFIRMED bookings hold a slot — tentative (unconfirmed) ones never conflict.
async function assertNoConflict(campId: string, parcelId: string, arrival: string, departure: string, excludeId?: string) {
  const candidates = await prisma.booking.findMany({
    where: { campId, parcelId, confirmed: true, id: excludeId ? { not: excludeId } : undefined },
  });
  const hit = candidates.find((b) => overlaps(arrival, departure, fromDbDate(b.arrival), fromDbDate(b.departure)));
  if (hit) throw new ConflictError(toBookingDTO(hit));
}

export type BookingInput = {
  parcelId: string;
  guestName: string;
  email?: string | null;
  phone?: string | null;
  arrival: string;
  departure: string;
  people: number;
  status?: BookingStatus;
  confirmed?: boolean;
  notes?: string | null;
};

function validateBookingInput(input: BookingInput) {
  if (!input.guestName?.trim()) throw new Error("Guest name is required.");
  if (!input.parcelId) throw new Error("Parcel is required.");
  if (!(input.departure > input.arrival)) throw new Error("Departure must be strictly after arrival.");
  if (!(input.people > 0)) throw new Error("People must be at least 1.");
  if (input.status && !STATUSES.includes(input.status)) throw new Error("Invalid status.");
}

const normStatus = (s?: BookingStatus): BookingStatus => (s && STATUSES.includes(s) ? s : "BOOKED_MOVABLE");

export async function createBooking(campId: string, input: BookingInput): Promise<BookingDTO> {
  validateBookingInput(input);
  await ownParcel(campId, input.parcelId);
  const confirmed = input.confirmed ?? true;
  if (confirmed) await assertNoConflict(campId, input.parcelId, input.arrival, input.departure);
  const row = await prisma.booking.create({
    data: {
      campId,
      parcelId: input.parcelId,
      guestName: input.guestName.trim(),
      email: input.email || null,
      phone: input.phone || null,
      arrival: toDbDate(input.arrival),
      departure: toDbDate(input.departure),
      people: input.people,
      status: normStatus(input.status),
      confirmed,
      notes: input.notes || null,
    },
  });
  return toBookingDTO(row);
}

export async function updateBooking(campId: string, id: string, input: BookingInput): Promise<BookingDTO> {
  validateBookingInput(input);
  await ownBooking(campId, id);
  await ownParcel(campId, input.parcelId);
  const confirmed = input.confirmed ?? true;
  if (confirmed) await assertNoConflict(campId, input.parcelId, input.arrival, input.departure, id);
  const row = await prisma.booking.update({
    where: { id },
    data: {
      parcelId: input.parcelId,
      guestName: input.guestName.trim(),
      email: input.email || null,
      phone: input.phone || null,
      arrival: toDbDate(input.arrival),
      departure: toDbDate(input.departure),
      people: input.people,
      status: normStatus(input.status),
      confirmed,
      notes: input.notes || null,
    },
  });
  return toBookingDTO(row);
}

export async function deleteBooking(campId: string, id: string): Promise<void> {
  await ownBooking(campId, id);
  await prisma.booking.delete({ where: { id } });
}

// ---------- parcel / type writes (all scoped) ----------

export async function renameParcelType(campId: string, id: string, name: string) {
  await ownType(campId, id);
  return prisma.parcelType.update({ where: { id }, data: { name: name.trim() } });
}

export function createParcelType(campId: string, name: string, order = 0) {
  return prisma.parcelType.create({ data: { campId, name: name.trim(), order } });
}

export async function deleteParcelType(campId: string, id: string) {
  await ownType(campId, id);
  const count = await prisma.parcel.count({ where: { typeId: id, campId } });
  if (count > 0) throw new InUseError("Type still has parcels.");
  return prisma.parcelType.delete({ where: { id } });
}

export async function renameParcel(campId: string, id: string, label: string) {
  await ownParcel(campId, id);
  return prisma.parcel.update({ where: { id }, data: { label: label.trim() } });
}

export async function setParcelType(campId: string, id: string, typeId: string) {
  await ownParcel(campId, id);
  await ownType(campId, typeId);
  return prisma.parcel.update({ where: { id }, data: { typeId } });
}

export async function setParcelCapacity(campId: string, id: string, capacity: number) {
  await ownParcel(campId, id);
  return prisma.parcel.update({ where: { id }, data: { capacity } });
}

export async function createParcel(campId: string, label: string, typeId: string, capacity: number, order = 0) {
  await ownType(campId, typeId);
  return prisma.parcel.create({ data: { campId, label: label.trim(), typeId, capacity, order } });
}

export async function deleteParcel(campId: string, id: string) {
  await ownParcel(campId, id);
  const count = await prisma.booking.count({ where: { parcelId: id, campId } });
  if (count > 0) throw new InUseError("Parcel still has bookings.");
  return prisma.parcel.delete({ where: { id } });
}

/** Persist a new parcel display order. `ids` is the full ordered list; order = index. */
export async function reorderParcels(campId: string, ids: string[]) {
  const owned = await prisma.parcel.findMany({ where: { campId, id: { in: ids } }, select: { id: true } });
  if (owned.length !== ids.length) throw new NotFoundError("Parcel not found.");
  await prisma.$transaction(ids.map((id, i) => prisma.parcel.update({ where: { id }, data: { order: i } })));
}

// ---------- notes (all scoped by campId) ----------

const toNoteDTO = (n: { id: string; title: string; body: string; createdAt: Date; updatedAt: Date }): NoteDTO => ({
  id: n.id,
  title: n.title,
  body: n.body,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
});

async function ownNote(campId: string, id: string) {
  const n = await prisma.note.findFirst({ where: { id, campId } });
  if (!n) throw new NotFoundError("Note not found.");
  return n;
}

function validateNote(title: string, body: string) {
  if (!title.trim() && !body.trim()) throw new Error("Note cannot be empty.");
}

export async function listNotes(campId: string): Promise<NoteDTO[]> {
  const rows = await prisma.note.findMany({ where: { campId }, orderBy: { updatedAt: "desc" } });
  return rows.map(toNoteDTO);
}

export async function createNote(campId: string, title: string, body: string): Promise<NoteDTO> {
  validateNote(title, body);
  const row = await prisma.note.create({ data: { campId, title: title.trim(), body } });
  return toNoteDTO(row);
}

export async function updateNote(campId: string, id: string, title: string, body: string): Promise<NoteDTO> {
  validateNote(title, body);
  await ownNote(campId, id);
  const row = await prisma.note.update({ where: { id }, data: { title: title.trim(), body } });
  return toNoteDTO(row);
}

export async function deleteNote(campId: string, id: string): Promise<void> {
  await ownNote(campId, id);
  await prisma.note.delete({ where: { id } });
}
