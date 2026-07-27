-- CreateTable
CREATE TABLE "KeyGrid" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyGrid_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeyGrid_campId_key" ON "KeyGrid"("campId");

-- AddForeignKey
ALTER TABLE "KeyGrid" ADD CONSTRAINT "KeyGrid_campId_fkey" FOREIGN KEY ("campId") REFERENCES "Camp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
