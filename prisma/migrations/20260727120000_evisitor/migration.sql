-- CreateTable
CREATE TABLE "EvisitorEntry" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 0,
    "c1218" INTEGER NOT NULL DEFAULT 0,
    "c512" INTEGER NOT NULL DEFAULT 0,
    "c05" INTEGER NOT NULL DEFAULT 0,
    "departure" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvisitorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvisitorEntry_campId_idx" ON "EvisitorEntry"("campId");

-- CreateIndex
CREATE INDEX "EvisitorEntry_parcelId_idx" ON "EvisitorEntry"("parcelId");

-- AddForeignKey
ALTER TABLE "EvisitorEntry" ADD CONSTRAINT "EvisitorEntry_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvisitorEntry" ADD CONSTRAINT "EvisitorEntry_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "Parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
