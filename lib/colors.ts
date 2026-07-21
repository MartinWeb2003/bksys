// Booking color is derived from its STATUS (not stored as a color). Same status -> same
// color in every view. The four statuses and their meanings live in lib/types.ts.

import type { BookingStatus } from "./types";
import type { Strings } from "./i18n";

export type Swatch = { bg: string; fg: string; soft: string };

export const STATUS_COLORS: Record<BookingStatus, Swatch> = {
  PAID: { bg: "#15803D", fg: "#ffffff", soft: "#DCFCE7" }, // green
  HERE_UNPAID: { bg: "#FACC15", fg: "#1c1917", soft: "#FEF9C3" }, // yellow (dark text for contrast)
  BOOKED_FIXED: { bg: "#DC2626", fg: "#ffffff", soft: "#FEE2E2" }, // red
  BOOKED_MOVABLE: { bg: "#EA580C", fg: "#ffffff", soft: "#FFEDD5" }, // orange
};

// Legend / picker order.
export const STATUS_ORDER: BookingStatus[] = ["PAID", "HERE_UNPAID", "BOOKED_FIXED", "BOOKED_MOVABLE"];

export const colorForStatus = (status: BookingStatus): Swatch => STATUS_COLORS[status];

const STATUS_KEYS: Record<BookingStatus, { label: keyof Strings; desc: keyof Strings }> = {
  PAID: { label: "st_paid", desc: "st_paid_desc" },
  HERE_UNPAID: { label: "st_here", desc: "st_here_desc" },
  BOOKED_FIXED: { label: "st_fixed", desc: "st_fixed_desc" },
  BOOKED_MOVABLE: { label: "st_movable", desc: "st_movable_desc" },
};

/** Ordered status metadata for the legend + form picker (label/desc localized). */
export function statusMeta(L: Strings) {
  return STATUS_ORDER.map((status) => ({
    status,
    color: STATUS_COLORS[status],
    label: L[STATUS_KEYS[status].label] as string,
    desc: L[STATUS_KEYS[status].desc] as string,
  }));
}
