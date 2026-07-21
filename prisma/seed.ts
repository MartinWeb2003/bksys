// Multi-tenant: each camp seeds its own default layout on registration
// (see lib/data.ts -> createCampWithDefaults). There is no global seed data.
// This file exists so `prisma migrate reset` / `prisma db seed` have something to run.

console.log("No global seed — camps are created and seeded via registration.");
