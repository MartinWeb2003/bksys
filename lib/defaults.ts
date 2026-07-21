// The default parcel layout every new camp starts with (Parcel A/B/C + A1–C3, no bookings).

export const DEFAULT_TYPES = [
  { name: "Parcel A", order: 0 },
  { name: "Parcel B", order: 1 },
  { name: "Parcel C", order: 2 },
];

export const DEFAULT_PARCELS: { label: string; type: string; capacity: number }[] = [
  ...["A1", "A2", "A3", "A4", "A5", "A6"].map((label) => ({ label, type: "Parcel A", capacity: 4 })),
  ...["B1", "B2", "B3", "B4"].map((label) => ({ label, type: "Parcel B", capacity: 6 })),
  ...["C1", "C2", "C3"].map((label) => ({ label, type: "Parcel C", capacity: 5 })),
];
