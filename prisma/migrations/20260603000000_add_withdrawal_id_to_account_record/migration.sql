ALTER TABLE `account_records`
  ADD COLUMN `withdrawalId` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `account_records_withdrawalId_key` (`withdrawalId`);

ALTER TABLE `account_records`
  ADD CONSTRAINT `account_records_withdrawalId_fkey`
  FOREIGN KEY (`withdrawalId`) REFERENCES `account_withdrawals`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
