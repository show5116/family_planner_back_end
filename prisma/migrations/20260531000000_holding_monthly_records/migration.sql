-- AccountHolding 테이블 제거
DROP TABLE IF EXISTS `account_holdings`;

-- AccountHoldingRecord 생성 (accountId 직접 참조, name/ticker 포함, 월별 이력)
CREATE TABLE `account_holding_records` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `recordDate` DATE NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `ticker` VARCHAR(20) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `ratio` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `account_holding_records_accountId_recordDate_name_key`(`accountId`, `recordDate`, `name`),
    INDEX `account_holding_records_accountId_recordDate_idx`(`accountId`, `recordDate` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `account_holding_records` ADD CONSTRAINT `account_holding_records_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
