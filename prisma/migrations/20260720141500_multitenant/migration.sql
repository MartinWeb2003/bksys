-- DropIndex
DROP INDEX "Parcel_label_key";

-- DropIndex
DROP INDEX "ParcelType_name_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "campId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN     "campId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ParcelType" ADD COLUMN     "campId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Camp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Camp_email_key" ON "Camp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordReset_campId_idx" ON "PasswordReset"("campId");

-- CreateIndex
CREATE INDEX "Booking_campId_idx" ON "Booking"("campId");

-- CreateIndex
CREATE INDEX "Parcel_campId_idx" ON "Parcel"("campId");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_campId_label_key" ON "Parcel"("campId", "label");

-- CreateIndex
CREATE INDEX "ParcelType_campId_idx" ON "ParcelType"("campId");

-- CreateIndex
CREATE UNIQUE INDEX "ParcelType_campId_name_key" ON "ParcelType"("campId", "name");

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParcelType" ADD CONSTRAINT "ParcelType_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

