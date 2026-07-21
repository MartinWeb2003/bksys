-- CreateTable
CREATE TABLE "ParcelType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ParcelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "people" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParcelType_name_key" ON "ParcelType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_label_key" ON "Parcel"("label");

-- CreateIndex
CREATE INDEX "Parcel_typeId_idx" ON "Parcel"("typeId");

-- CreateIndex
CREATE INDEX "Booking_parcelId_arrival_departure_idx" ON "Booking"("parcelId", "arrival", "departure");

-- AddForeignKey
ALTER TABLE "Parcel" ADD CONSTRAINT "Parcel_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ParcelType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
