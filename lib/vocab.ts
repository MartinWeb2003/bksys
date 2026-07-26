// Business-kind catalog for onboarding. Each kind a camp can manage maps to:
//   - a ParcelType display name (hr/en) used to seed the starting type,
//   - a unit noun (singular/plural, hr/en) that drives app-wide relabeling,
//   - a label prefix + default capacity for the auto-generated units.
// Onboarding lets the admin pick one or more kinds; each becomes exactly one ParcelType.
// Everything picked here is renameable afterwards in the Parcels management view.

import type { Lang } from "./i18n";

// Keys of the noun sets used to relabel the whole UI. Stored as Camp.unitNoun.
export type UnitNoun = "parcel" | "apartment" | "room" | "mobileHome" | "tent" | "unit";

// Selectable business categories in the onboarding step.
export type BusinessKindKey = "camp" | "apartments" | "rooms" | "mobileHomes" | "glamping" | "other";

type LangText = { hr: string; en: string };
type NounForms = { one: LangText; many: LangText };

// Singular / plural noun per unit, in both languages. This is the vocabulary the whole
// dashboard is relabeled with (see lib/i18n.ts makeStrings).
export const UNIT_NOUNS: Record<UnitNoun, NounForms> = {
  parcel: { one: { hr: "parcela", en: "parcel" }, many: { hr: "parcele", en: "parcels" } },
  apartment: { one: { hr: "apartman", en: "apartment" }, many: { hr: "apartmani", en: "apartments" } },
  room: { one: { hr: "soba", en: "room" }, many: { hr: "sobe", en: "rooms" } },
  mobileHome: { one: { hr: "mobilna kućica", en: "mobile home" }, many: { hr: "mobilne kućice", en: "mobile homes" } },
  tent: { one: { hr: "šator", en: "tent" }, many: { hr: "šatori", en: "tents" } },
  unit: { one: { hr: "jedinica", en: "unit" }, many: { hr: "jedinice", en: "units" } },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The four noun forms (lower/capitalized × singular/plural) for a unit in one language. */
export function nounForms(unit: UnitNoun, lang: Lang) {
  const n = UNIT_NOUNS[unit] ?? UNIT_NOUNS.unit;
  const one = n.one[lang];
  const many = n.many[lang];
  return { one, many, oneCap: cap(one), manyCap: cap(many) };
}

export type BusinessKind = {
  key: BusinessKindKey;
  unit: UnitNoun; // which app-wide noun this kind contributes when chosen alone
  typeName: LangText; // seeded ParcelType.name
  label: LangText; // card label in the onboarding UI
  labelPrefix: string; // auto-generated unit labels are `${labelPrefix}${n}`
  capacity: number; // default capacity per generated unit
  defaultCount: number; // pre-filled count in the form
};

export const BUSINESS_KINDS: BusinessKind[] = [
  {
    key: "camp",
    unit: "parcel",
    typeName: { hr: "Parcele", en: "Parcels" },
    label: { hr: "Kamp (parcele)", en: "Campsite (parcels)" },
    labelPrefix: "P",
    capacity: 4,
    defaultCount: 10,
  },
  {
    key: "apartments",
    unit: "apartment",
    typeName: { hr: "Apartmani", en: "Apartments" },
    label: { hr: "Apartmani", en: "Apartments" },
    labelPrefix: "A",
    capacity: 4,
    defaultCount: 6,
  },
  {
    key: "rooms",
    unit: "room",
    typeName: { hr: "Sobe", en: "Rooms" },
    label: { hr: "Sobe", en: "Rooms" },
    labelPrefix: "S",
    capacity: 2,
    defaultCount: 8,
  },
  {
    key: "mobileHomes",
    unit: "mobileHome",
    typeName: { hr: "Mobilne kućice", en: "Mobile homes" },
    label: { hr: "Mobilne kućice", en: "Mobile homes" },
    labelPrefix: "M",
    capacity: 5,
    defaultCount: 6,
  },
  {
    key: "glamping",
    unit: "tent",
    typeName: { hr: "Glamping", en: "Glamping" },
    label: { hr: "Glamping / šatori", en: "Glamping / tents" },
    labelPrefix: "G",
    capacity: 3,
    defaultCount: 4,
  },
  {
    key: "other",
    unit: "unit",
    typeName: { hr: "Jedinice", en: "Units" },
    label: { hr: "Ostalo", en: "Other" },
    labelPrefix: "U",
    capacity: 4,
    defaultCount: 5,
  },
];

export const kindByKey = (key: string): BusinessKind | undefined => BUSINESS_KINDS.find((k) => k.key === key);

export const isBusinessKind = (key: string): key is BusinessKindKey => !!kindByKey(key);

/** App-wide noun: the sole chosen kind's noun when exactly one is picked, else generic "unit". */
export function resolveUnitNoun(kinds: BusinessKindKey[]): UnitNoun {
  if (kinds.length === 1) return kindByKey(kinds[0])?.unit ?? "unit";
  return "unit";
}
