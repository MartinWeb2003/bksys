// Deterministic booking color: same booking id -> same color in every view.
// Never stored in the DB — derived on the fly.

export const PALETTE = [
  { bg: "#0E7490", soft: "#E0F2F7" }, // sea teal
  { bg: "#B4552D", soft: "#F9E9E1" }, // terracotta
  { bg: "#5B4FC4", soft: "#EAE8FA" }, // iris
  { bg: "#0F766E", soft: "#DFF2F0" }, // pine
  { bg: "#B91C1C", soft: "#FBE5E5" }, // brick
  { bg: "#A16207", soft: "#F8EFDC" }, // ochre
  { bg: "#1D4ED8", soft: "#E3EAFB" }, // cobalt
  { bg: "#9D174D", soft: "#F9E3ED" }, // plum
] as const;

export type Swatch = (typeof PALETTE)[number];

export const colorForId = (id: string): Swatch => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};
