// Pure, runtime-free types shared between server (lib/data) and client components.

export type BookingDTO = {
  id: string;
  parcelId: string;
  guestName: string;
  email: string | null;
  phone: string | null;
  arrival: string; // "YYYY-MM-DD"
  departure: string; // "YYYY-MM-DD"
  people: number;
  notes: string | null;
  createdAt: string; // "YYYY-MM-DD"
};

export type TypeVM = { id: string; name: string; order: number };

export type ParcelVM = {
  id: string;
  label: string;
  typeId: string;
  typeName: string;
  capacity: number;
  order: number;
};
