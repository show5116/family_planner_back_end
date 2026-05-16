-- Expense에 shoppingHistoryId 컬럼 추가 (장보기 완료 시 가계부 연동)
ALTER TABLE `expenses` ADD COLUMN `shoppingHistoryId` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD UNIQUE INDEX `expenses_shoppingHistoryId_key`(`shoppingHistoryId`);
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_shoppingHistoryId_fkey` FOREIGN KEY (`shoppingHistoryId`) REFERENCES `shopping_histories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
