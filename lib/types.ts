// Pure, runtime-free types shared between server (lib/data) and client components.

// Booking status — drives the color everywhere (see lib/colors.ts). Values match the
// Prisma BookingStatus enum exactly.
export type BookingStatus = "PAID" | "HERE_UNPAID" | "BOOKED_FIXED" | "BOOKED_MOVABLE";

export type BookingDTO = {
  id: string;
  parcelId: string;
  guestName: string;
  email: string | null;
  phone: string | null;
  arrival: string; // "YYYY-MM-DD"
  departure: string; // "YYYY-MM-DD"
  people: number;
  status: BookingStatus;
  confirmed: boolean; // false = tentative (Nepotvrđeno), kept off the calendar
  notes: string | null;
  createdAt: string; // "YYYY-MM-DD"
};

export type NoteDTO = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
};

// The Notes-page key tracker. Each column (e.g. "F"/"A") holds a list of slots; each slot has
// an editable name (default "F1", "A1"…) and the parcel it was handed to ("" = not given out).
export type KeyCell = { name: string; value: string };
export type KeyColumn = { id: string; label: string; cells: KeyCell[] };
export type KeyGridData = { enabled: boolean; columns: KeyColumn[] };

export type TypeVM = { id: string; name: string; order: number };

export type ParcelVM = {
  id: string;
  label: string;
  typeId: string;
  typeName: string;
  capacity: number;
  order: number;
};
