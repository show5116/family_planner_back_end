-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `refundedExpenseId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `expenses_refundedExpenseId_idx` ON `expenses`(`refundedExpenseId`);

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_refundedExpenseId_fkey` FOREIGN KEY (`refundedExpenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
