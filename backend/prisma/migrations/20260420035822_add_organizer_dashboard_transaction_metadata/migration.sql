-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "couponCodeUsed" VARCHAR(50),
ADD COLUMN     "couponDiscountUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "decisionAt" TIMESTAMP(3),
ADD COLUMN     "decisionNote" VARCHAR(255),
ADD COLUMN     "voucherCodeUsed" VARCHAR(50),
ADD COLUMN     "voucherDiscountUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "walletAmountUsed" INTEGER NOT NULL DEFAULT 0;
