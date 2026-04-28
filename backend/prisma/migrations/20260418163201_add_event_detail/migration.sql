-- AlterTable
ALTER TABLE "events" ADD COLUMN     "city" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "eventDate" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "startTime" TEXT;
