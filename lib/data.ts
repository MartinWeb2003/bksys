// Centralized, tenant-scoped DB access. EVERY read/write is filtered by campId — this
// is the single place isolation is enforced, so no route or component can leak across camps.

import crypto from "crypto";
import { prisma } from "./prisma";
import { overlaps, fromDbDate, toDbDate } from "./dates";
import { DEFAULT_TYPES, DEFAULT_PARCELS } from "./defaults";
import type { BookingDTO } from "./types";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

const toBookingDTO = (b: {
  id: string;
  parcelId: string;
  guestName: string;
  email: string | null;
  phone: string | null;
  arrival: Date;
  departure: Date;
  people: number;
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

// ---------- camps / auth ----------

export function findCampByEmail(email: string) {
  return prisma.camp.findUnique({ where: { email: email.toLowerCase() } });
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

async function assertNoConflict(campId: string, parcelId: string, arrival: string, departure: string, excludeId?: string) {
  const candidates = await prisma.booking.findMany({
    where: { campId, parcelId, id: excludeId ? { not: excludeId } : undefined },
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
  notes?: string | null;
};

function validateBookingInput(input: BookingInput) {
  if (!input.guestName?.trim()) throw new Error("Guest name is required.");
  if (!input.parcelId) throw new Error("Parcel is required.");
  if (!(input.departure > input.arrival)) throw new Error("Departure must be strictly after arrival.");
  if (!(input.people > 0)) throw new Error("People must be at least 1.");
}

export async function createBooking(campId: string, input: BookingInput): Promise<BookingDTO> {
  validateBookingInput(input);
  await ownParcel(campId, input.parcelId);
  await assertNoConflict(campId, input.parcelId, input.arrival, input.departure);
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
      notes: input.notes || null,
    },
  });
  return toBookingDTO(row);
}

export async function updateBooking(campId: string, id: string, input: BookingInput): Promise<BookingDTO> {
  validateBookingInput(input);
  await ownBooking(campId, id);
  await ownParcel(campId, input.parcelId);
  await assertNoConflict(campId, input.parcelId, input.arrival, input.departure, id);
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
