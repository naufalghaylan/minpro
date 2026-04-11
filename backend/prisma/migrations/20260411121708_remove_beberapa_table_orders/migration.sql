/*
  Warnings:

  - You are about to drop the column `paymentProof` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "paymentProof",
DROP COLUMN "status";
