-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PAID', 'HERE_UNPAID', 'BOOKED_FIXED', 'BOOKED_MOVABLE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT 'BOOKED_MOVABLE';

