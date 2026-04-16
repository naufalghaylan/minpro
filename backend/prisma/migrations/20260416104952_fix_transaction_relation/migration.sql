/*
  Warnings:

  - You are about to drop the `_ordersTotransaction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[transactionId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `transactionId` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ordersTotransaction" DROP CONSTRAINT "_ordersTotransaction_A_fkey";

-- DropForeignKey
ALTER TABLE "_ordersTotransaction" DROP CONSTRAINT "_ordersTotransaction_B_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "transactionId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ordersTotransaction";

-- CreateIndex
CREATE UNIQUE INDEX "orders_transactionId_key" ON "orders"("transactionId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
