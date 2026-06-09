-- AlterTable: expenses에 memberId 추가
ALTER TABLE `expenses`
    ADD COLUMN `memberId` VARCHAR(191) NULL;

-- AlterTable: recurring_expenses에 memberId 추가
ALTER TABLE `recurring_expenses`
    ADD COLUMN `memberId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `expenses_memberId_idx` ON `expenses`(`memberId`);
CREATE INDEX `recurring_expenses_memberId_idx` ON `recurring_expenses`(`memberId`);

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_expenses` ADD CONSTRAINT `recurring_expenses_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
