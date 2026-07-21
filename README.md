# Camp Desk

Multi-tenant booking dashboard for campsites. Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL (Neon). Each camp registers its own account; its parcels/types/bookings are isolated by `campId`. Croatian/English UI. See [CLAUDE.md](./CLAUDE.md) for the full spec and domain rules.

## First-time setup

1. **Create a Neon Postgres database** at [neon.tech](https://neon.tech) (free tier).
   In the project's **Connection Details**, copy both connection strings:
   - the **pooled** string (host contains `-pooler`) → `DATABASE_URL`
   - the **direct** string (no `-pooler`) → `DIRECT_URL`

2. **Fill in `.env`** (already gitignored; template in `.env.example`):
   ```env
   DATABASE_URL="postgresql://…-pooler….neon.tech/…?sslmode=require"
   DIRECT_URL="postgresql://….neon.tech/…?sslmode=require"
   SESSION_SECRET="a-long-random-string"        # openssl rand -base64 32
   # Password-reset email (optional in dev — link is logged to the console if unset):
   RESEND_API_KEY=""
   EMAIL_FROM="Camp Desk <onboarding@resend.dev>"
   APP_BASE_URL="http://localhost:3000"
   ```

3. **Create the tables:**
   ```bash
   npx prisma migrate deploy   # applies existing migrations (or: npm run db:migrate for dev)
   ```
   There is **no global seed** — each camp is seeded with the default parcel layout when it registers.

4. **Run it:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 → **Register** a camp (name + email + password). You're seeded with the default layout (Parcel A/B/C, A1–C3) and logged straight in.

## Auth

- **Register / login** with email + password. Passwords are hashed with **bcrypt**; the session is a signed `jose` JWT (carrying `campId`) in an httpOnly cookie.
- **Password reset** via `/forgot` → emailed link → `/reset`. Tokens are single-use, expire in 1 hour, and are stored only as a sha256 hash. Without `RESEND_API_KEY` the reset link is printed to the **server console** (dev), so the flow is fully testable locally. For production, set up a [Resend](https://resend.com) account + verified domain and a real `EMAIL_FROM`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run db:migrate` | `prisma migrate dev` (interactive) |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run db:generate` | Regenerate Prisma client |

## Structure

- `app/` — dashboard (`page.tsx`); auth pages `login/ register/ forgot/ reset/`; API route handlers under `api/` (`auth/*`, `bookings`, `parcels`, `types`)
- `components/` — client components (Dashboard shell + the 5 views + booking form)
- `lib/` — `dates.ts` (overlap rule + date math), `i18n.ts` (HR/EN), `colors.ts`, **`data.ts` (all DB access, campId-scoped)**, `auth.ts` (jose session, edge-safe), `session.ts` (server session helpers), `password.ts` (bcrypt), `email.ts` (Resend), `defaults.ts` (default layout), `prisma.ts`
- `prisma/` — `schema.prisma`, `migrations/`
- `middleware.ts` — gates everything behind the camp session except the auth pages/APIs

## Deploy (Vercel)

Push to GitHub, import in Vercel, set the env vars from `.env` (use Neon's **pooled** URL for `DATABASE_URL`, **direct** for `DIRECT_URL`, and a real `APP_BASE_URL` + Resend config), and run `prisma migrate deploy` against the production DB.
