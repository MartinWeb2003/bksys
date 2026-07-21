# CLAUDE.md — Camp Desk

Booking dashboard for campsites, delivered as a **multi-tenant SaaS**. Each **Camp** is a tenant with one account (email + password); a camp's data (parcels, types, bookings) is fully isolated from every other camp by `campId`. No guest-facing side. Within a single camp there is still just **one login** — no per-camp user roles yet. This is the camp admin's daily control panel: a spreadsheet-style overview of who is where and when.

Do not add features, roles, or abstractions that aren't in this spec. When in doubt, keep it small. Billing/subscriptions/pricing and multiple-users-per-camp are explicitly deferred (see Out of scope).

---

## Domain rules (read first — these drive everything)

- **A parcel is occupied from midday of arrival to midday of departure.** This is the single most important rule. It means two bookings can legitimately share one calendar date on the same parcel: one guest leaves in the morning, another arrives that afternoon.
- **Overlap / conflict test** (use everywhere — availability, conflict validation, calendar):
  ```
  bookingsOverlap(a, b) = a.arrival < b.departure && a.departure > b.arrival
  ```
  Strict `<` / `>` (never `<=` / `>=`). This makes same-day turnover count as *free*, not a conflict. Do not "fix" this to inclusive comparison — it will break turnover.
- **Nights, not days.** A stay of arrival 15th → departure 20th is 5 nights. Duration is always measured in nights.
- **Dates are date-only** (no time component). Store and compare as `YYYY-MM-DD`. Do not introduce timezones into booking dates — a booking is a calendar date, not an instant. All date math is done in UTC to avoid DST drift.
- **Departure must be strictly after arrival.** Reject zero/negative-length stays.

---

## What exists / what to build

**Current state:** a single-file React prototype (`camp-booking-dashboard.jsx`) with in-memory state and seeded demo data. It's the UX reference — the layout, interactions, and domain logic are correct and should be preserved. It has no persistence. Beyond the original four views it now also has: an **HR/EN language toggle (Croatian is the default)**, **editable parcel types and parcels** (rename inline — including by double-click in the Calendar — plus add/remove) via a fifth **Parcels** management view, and an Availability view that reports each free parcel's **free-until window**.

**Target:** promote it to a real Next.js app with a database so data survives refreshes and is reachable from any device (admin checks it from phone/laptop). Keep the same views and the same domain rules.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling (prototype already uses utility classes)
- **Prisma** ORM + **PostgreSQL** (Neon or Supabase free tier)
- **Auth:** per-camp accounts. Register (camp name + email + password) → creates a `Camp`, hashes the password with **bcrypt**, seeds the default parcel layout, and starts a session. Login is email + password. Sessions are a **signed jose JWT carrying `campId`** in an httpOnly cookie (30 days), verified in edge middleware. **Password reset via email** (Resend; dev logs the link when `RESEND_API_KEY` is unset) using single-use, 1-hour, sha256-hashed tokens. The whole auth surface lives behind `lib/auth.ts` (edge-safe, jose only), `lib/session.ts` (server helpers), and `lib/password.ts` (bcrypt) so it stays swappable. No per-camp roles, no social login.
- **i18n:** two languages, **Croatian (default) and English**, via a lightweight dictionary (one `lib/i18n.ts` with `hr`/`en` string maps) toggled client-side — **no i18n framework**. UI labels are translated; guest data/notes are stored verbatim. Language is a display preference, not persisted server-side.
- **Deploy:** Vercel.

---

## Data model

```prisma
model Camp {
  id           String          @id @default(cuid())
  name         String                                 // camp display name
  email        String          @unique                // login identity
  passwordHash String                                 // bcrypt — never plaintext
  createdAt    DateTime        @default(now())
  types        ParcelType[]
  parcels      Parcel[]
  bookings     Booking[]
  resets       PasswordReset[]
}

model PasswordReset {
  id        String    @id @default(cuid())
  campId    String
  camp      Camp      @relation(fields: [campId], references: [id], onDelete: Cascade)
  tokenHash String    @unique          // sha256 of the emailed token — raw token never stored
  expiresAt DateTime
  usedAt    DateTime?                  // single-use
  createdAt DateTime  @default(now())
  @@index([campId])
}

model ParcelType {
  id      String   @id @default(cuid())  // stable internal id
  campId  String                          // tenant scope
  camp    Camp     @relation(fields: [campId], references: [id], onDelete: Cascade)
  name    String                          // display label, e.g. "Parcel A" — admin-editable
  order   Int      @default(0)
  parcels Parcel[]
  @@unique([campId, name])                // unique PER CAMP, not globally
  @@index([campId])
}

model Parcel {
  id       String     @id @default(cuid())  // stable internal id — NEVER shown, NEVER changes
  campId   String
  camp     Camp       @relation(fields: [campId], references: [id], onDelete: Cascade)
  label    String                            // human-readable, e.g. "A1" — admin-editable
  typeId   String
  type     ParcelType @relation(fields: [typeId], references: [id], onDelete: Restrict)
  capacity Int
  order    Int        @default(0)
  bookings Booking[]
  @@unique([campId, label])                 // unique per camp
  @@index([campId])
  @@index([typeId])
}

model Booking {
  id        String   @id @default(cuid())
  campId    String
  camp      Camp     @relation(fields: [campId], references: [id], onDelete: Cascade)
  parcelId  String                        // FK → Parcel.id (the stable id, not the label)
  parcel    Parcel   @relation(fields: [parcelId], references: [id], onDelete: Restrict)
  guestName String
  email     String?
  phone     String?
  arrival   DateTime @db.Date     // date-only
  departure DateTime @db.Date     // date-only, strictly after arrival
  people    Int
  notes     String?  @db.Text
  createdAt DateTime @default(now())  // = "date of reservation/booking"
  @@index([campId])
  @@index([parcelId, arrival, departure])
}
```

**Tenant isolation is the top invariant.** Every ParcelType/Parcel/Booking belongs to exactly one `Camp` via `campId`. **All DB access goes through `lib/data.ts`, and every function takes a `campId` and filters by it** — reads are `where: { campId }`, and writes verify ownership first (returning a 404 `NotFoundError` if a row isn't the caller's). No route or component may query Prisma directly. This is what makes cross-tenant access impossible; it is verified (Camp A gets 404 on any attempt to read/modify Camp B's rows).

**Why stable id vs editable label/name:** parcels/types are admin-editable, so their human-readable text is *not* the primary key. Bookings reference the stable `Parcel.id`, so renaming is a pure display change — no cascade. Uniqueness is **per camp** (`@@unique([campId, name])` / `([campId, label])`), so two different camps can both have an "A1".

**Referential guards:** `onDelete: Cascade` from `Camp` (deleting a camp removes all its data); `onDelete: Restrict` on parcel↔booking and type↔parcel (a parcel with bookings, or a type with parcels, can't be deleted) — surfaced as friendly 409s, with the UI disabling the remove action.

New camps are seeded with the **default layout** (`lib/defaults.ts`: types Parcel A/B/C + parcels A1–A6, B1–B4, C1–C3, no bookings) on registration via `createCampWithDefaults`. There is no global seed.

---

## Pages / views

All views live under one authenticated dashboard shell with tab navigation. A global "+ New booking" action and the HR/EN language toggle are always reachable in the header.

1. **Calendar** — Gantt: rows = parcels (grouped by type), columns = dates, ~3-week window with week-step navigation and a "Today" jump. Each booking is a **color-coded bar**; color is derived deterministically from the booking id so the same booking has the same color across *all* views. Bars start at the horizontal midpoint of the arrival column and end at the midpoint of the departure column — this is what makes same-day turnover render as two adjacent half-bars rather than a clash. Clicking an empty cell opens the New Booking form pre-filled with that parcel + date. Clicking a bar opens that booking for editing.

2. **Today** — two lists, arrivals today and departures today, each showing guest, parcel, people, contact, and notes. Cards link to the booking.

3. **Availability** — inputs: arrival date, departure date, parcel type (or "all"). Output: every matching parcel flagged free/taken for that exact window, using the overlap rule above so turnover days read as free. Each **free** parcel also shows its **free window** — the maximal contiguous span with no booking around the requested range (previous departure → next arrival), phrased naturally: "free from X onwards", "free until Y", "free X – Y", or "free all season". Each **taken** parcel shows the date it next frees up. Free parcels have a one-click "Book" that opens the form pre-filled with the range + parcel.

4. **All bookings** — the spreadsheet view. Sortable table with every field (parcel, guest, arrival, departure, nights, people, contact, reserved-on, notes) + text search across name/contact/parcel. Row click → edit.

5. **Parcels** — management view. Rename parcel types and individual parcels inline, change a parcel's type and capacity, and add/remove parcels and types. Removal is guarded (a type with parcels, or a parcel with bookings, can't be removed). Parcels and types are also renameable directly from the Calendar by double-clicking their labels.

**Booking form** (modal): all fields; validates departure > arrival and surfaces real conflicts (full overlap on the same parcel) while explicitly allowing same-day turnover. Shows nights count live. Edit mode offers delete.

---

## Conventions

- Keep date helpers in one module (`lib/dates.ts`): `addDays`, `nightsBetween`, `overlaps`, `formatDate`. Every view imports from here — no ad-hoc date math in components.
- The `overlaps` helper is the single source of truth for conflict/availability logic. If turnover ever breaks, look here first.
- Server-side: re-validate the overlap rule on create/update in the API route. Never trust the client to have prevented a conflict.
- Colors: one `colorForId(id)` function, deterministic hash → fixed palette. Do not store color in the DB.
- Prefer server components + route handlers for data; client components only where interaction requires it (calendar, forms, search, management).
- Croatian is fine for guest-facing notes/data, and Croatian is the default UI language — but keep **code** (identifiers, comments) in English. All user-visible UI strings go through the `lib/i18n.ts` dictionary (`hr`/`en`); never hardcode display text in components.
- Display `parcel.label` and `type.name` everywhere in the UI; never surface the internal `id`. Group Calendar rows and the type filter by `ParcelType`, ordered by `order`.

## Future direction (design for it, don't build it yet)

Multi-tenancy is **done** (per-camp accounts + `campId` isolation). The next SaaS layer — **billing/subscriptions** — is deferred until there's more than one paying camp. Keep it an additive change when it comes: a `Subscription`/`plan` on `Camp`, gated in middleware or `lib/data.ts`; don't scatter plan checks through the UI. If **multiple users per camp** is ever needed, add a `User` table with a `campId` FK and move `email`/`passwordHash` off `Camp` onto `User` — the auth seam (`lib/auth.ts` / `lib/session.ts`) is where that swap happens.

## Out of scope (don't build unless asked)

Guest self-service, payments/invoicing/subscriptions/pricing, multiple users or roles **within** a camp, email/SMS booking notifications, drag-to-resize on the calendar, recurring bookings, reporting/exports, languages beyond HR/EN.

(Already built though originally out of scope: parcel/parcel-type CRUD, multi-tenant camp accounts, and password reset — see the sections above.)
