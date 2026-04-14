-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_ordersId_fkey";

-- CreateTable
CREATE TABLE "_ordersTotransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ordersTotransaction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ordersTotransaction_B_index" ON "_ordersTotransaction"("B");

-- AddForeignKey
ALTER TABLE "_ordersTotransaction" ADD CONSTRAINT "_ordersTotransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ordersTotransaction" ADD CONSTRAINT "_ordersTotransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
