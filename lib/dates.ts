// Single source of truth for booking date math.
// Bookings are DATE-ONLY. In the app layer we pass them around as "YYYY-MM-DD"
// strings and do all comparison lexicographically / in UTC — never with local time.

const DAY = 86_400_000;

/** "YYYY-MM-DD" -> Date at UTC midnight. */
export const parse = (s: string): Date => new Date(s + "T00:00:00Z");

/** Date -> "YYYY-MM-DD" (UTC). */
export const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Today as "YYYY-MM-DD" (UTC). */
export const todayISO = (): string => iso(new Date());

export const addDays = (s: string, n: number): string => iso(new Date(parse(s).getTime() + n * DAY));

export const nightsBetween = (a: string, b: string): number => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY);

/**
 * THE overlap rule. Strict `<` / `>` so same-day turnover (one guest departs the
 * morning another arrives) counts as FREE, not a conflict. Never make this inclusive.
 */
export const overlaps = (a1: string, d1: string, a2: string, d2: string): boolean => a1 < d2 && d1 > a2;

/** "20.7.2026." */
export const formatDate = (s: string): string => {
  const d = parse(s);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}.`;
};

/** "20.7." */
export const formatShort = (s: string): string => {
  const d = parse(s);
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
};

// --- Prisma @db.Date boundary conversions ---
/** DB Date (UTC midnight) -> "YYYY-MM-DD". */
export const fromDbDate = (d: Date): string => iso(d);
/** "YYYY-MM-DD" -> Date for storing in a @db.Date column. */
export const toDbDate = (s: string): Date => parse(s);
