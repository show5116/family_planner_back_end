-- CreateTable
CREATE TABLE `recurring_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL DEFAULT 'EXPENSE',
    `amount` DECIMAL(10, 2) NOT NULL,
    `isVariable` BOOLEAN NOT NULL DEFAULT false,
    `category` ENUM('TRANSPORTATION', 'FOOD', 'GROCERIES', 'LEISURE', 'LIVING', 'MEDICAL', 'EDUCATION', 'ALLOWANCE', 'CELEBRATION', 'ASSET_TRANSFER', 'CHILDCARE', 'COMMUNICATION', 'OTHER') NULL,
    `incomeCategory` ENUM('SALARY', 'ALLOWANCE', 'CARRYOVER', 'BONUS', 'INTEREST', 'RENTAL', 'SIDE_INCOME', 'TRANSFER_IN', 'OTHER_INCOME') NULL,
    `paymentMethod` ENUM('CARD', 'CASH', 'TRANSFER') NULL,
    `merchantId` VARCHAR(191) NULL,
    `description` VARCHAR(200) NULL,
    `dayOfMonth` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recurring_expenses_groupId_isActive_idx`(`groupId`, `isActive`),
    INDEX `recurring_expenses_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `recurring_expenses_dayOfMonth_idx`(`dayOfMonth`),
    INDEX `recurring_expenses_merchantId_idx`(`merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: expenses에 recurringExpenseId, isConfirmed 컬럼 추가 (먼저 추가, FK는 나중에)
ALTER TABLE `expenses`
    ADD COLUMN `recurringExpenseId` VARCHAR(191) NULL,
    ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT true;

-- MigrateData: isRecurring=true인 expenses 중 대표 레코드를 recurring_expenses로 이전
-- 동일 (groupId, userId, category, description, paymentMethod, merchantId) 묶음에서
-- 가장 최근 날짜의 amount/estimatedAmount를 사용하되,
-- dayOfMonth는 가장 오래된 날짜(최초 등록일)의 day를 사용 (clamp 이전 원래 날짜 보존)
INSERT INTO `recurring_expenses` (
    `id`, `groupId`, `userId`, `type`, `amount`, `isVariable`,
    `category`, `incomeCategory`, `paymentMethod`, `merchantId`,
    `description`, `dayOfMonth`, `isActive`, `createdAt`, `updatedAt`
)
SELECT
    UUID(),
    latest.`groupId`,
    latest.`userId`,
    e_latest.`type`,
    e_latest.`amount`,
    (e_latest.`estimatedAmount` IS NOT NULL),
    latest.`category`,
    e_latest.`incomeCategory`,
    latest.`paymentMethod`,
    latest.`merchantId`,
    latest.`description`,
    DAY(e_first.`date`),
    true,
    e_first.`createdAt`,
    NOW()
FROM (
    SELECT
        MAX(`date`)  AS max_date,
        MIN(`date`)  AS min_date,
        `groupId`, `userId`, `category`, `description`, `paymentMethod`, `merchantId`
    FROM `expenses`
    WHERE `isRecurring` = true
    GROUP BY `groupId`, `userId`, `category`, `description`, `paymentMethod`, `merchantId`
) latest
INNER JOIN `expenses` e_latest
    ON e_latest.`date` = latest.max_date
    AND (e_latest.`groupId` <=> latest.`groupId`)
    AND e_latest.`userId` = latest.`userId`
    AND (e_latest.`category` <=> latest.`category`)
    AND (e_latest.`description` <=> latest.`description`)
    AND (e_latest.`paymentMethod` <=> latest.`paymentMethod`)
    AND (e_latest.`merchantId` <=> latest.`merchantId`)
    AND e_latest.`isRecurring` = true
INNER JOIN `expenses` e_first
    ON e_first.`date` = latest.min_date
    AND (e_first.`groupId` <=> latest.`groupId`)
    AND e_first.`userId` = latest.`userId`
    AND (e_first.`category` <=> latest.`category`)
    AND (e_first.`description` <=> latest.`description`)
    AND (e_first.`paymentMethod` <=> latest.`paymentMethod`)
    AND (e_first.`merchantId` <=> latest.`merchantId`)
    AND e_first.`isRecurring` = true;

-- CreateIndex
CREATE INDEX `expenses_recurringExpenseId_idx` ON `expenses`(`recurringExpenseId`);

-- AddForeignKey
ALTER TABLE `recurring_expenses` ADD CONSTRAINT `recurring_expenses_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_expenses` ADD CONSTRAINT `recurring_expenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_expenses` ADD CONSTRAINT `recurring_expenses_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_recurringExpenseId_fkey` FOREIGN KEY (`recurringExpenseId`) REFERENCES `recurring_expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: isRecurring, estimatedAmount 컬럼 제거 (isConfirmed는 유지)
ALTER TABLE `expenses`
    DROP COLUMN `isRecurring`,
    DROP COLUMN `estimatedAmount`;
