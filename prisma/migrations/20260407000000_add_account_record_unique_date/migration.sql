-- AddUniqueConstraint
ALTER TABLE `account_records` ADD UNIQUE KEY `account_records_accountId_recordDate_key` (`accountId`, `recordDate`);
