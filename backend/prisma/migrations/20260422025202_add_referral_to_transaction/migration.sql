-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "referralCodeUsed" TEXT,
ADD COLUMN     "referralDiscountUsed" INTEGER NOT NULL DEFAULT 0;
