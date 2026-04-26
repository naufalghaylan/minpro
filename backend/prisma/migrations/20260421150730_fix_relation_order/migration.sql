-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "referralCodeUsed" TEXT,
ADD COLUMN     "referralDiscount" INTEGER NOT NULL DEFAULT 0;
