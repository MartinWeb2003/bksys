-- AlterTable
ALTER TABLE "Camp" ADD COLUMN     "businessKinds" TEXT NOT NULL DEFAULT 'camp',
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "unitNoun" TEXT NOT NULL DEFAULT 'parcel';

-- Backfill: every camp that already exists has its layout, so mark it onboarded.
-- This keeps existing accounts entirely out of the new onboarding flow.
UPDATE "Camp" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
