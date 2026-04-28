-- AlterTable
ALTER TABLE "events" ADD COLUMN     "discountEnd" TIMESTAMP(3),
ADD COLUMN     "discountStart" TIMESTAMP(3),
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" INTEGER;
