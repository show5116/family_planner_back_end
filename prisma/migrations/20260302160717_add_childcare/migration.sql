-- CreateTable
CREATE TABLE `childcare_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `childUserId` VARCHAR(191) NOT NULL,
    `parentUserId` VARCHAR(191) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `monthlyAllowance` INTEGER NOT NULL,
    `savingsBalance` INTEGER NOT NULL DEFAULT 0,
    `savingsInterestRate` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `childcare_accounts_groupId_idx`(`groupId`),
    INDEX `childcare_accounts_childUserId_idx`(`childUserId`),
    INDEX `childcare_accounts_parentUserId_idx`(`parentUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `childcare_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `type` ENUM('ALLOWANCE', 'REWARD', 'PENALTY', 'PURCHASE', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAW', 'INTEREST') NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `childcare_transactions_accountId_createdAt_idx`(`accountId`, `createdAt` DESC),
    INDEX `childcare_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `childcare_rewards` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `points` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `childcare_rewards_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `childcare_rules` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `penalty` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `childcare_rules_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `childcare_accounts` ADD CONSTRAINT `childcare_accounts_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_accounts` ADD CONSTRAINT `childcare_accounts_childUserId_fkey` FOREIGN KEY (`childUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_accounts` ADD CONSTRAINT `childcare_accounts_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_transactions` ADD CONSTRAINT `childcare_transactions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_transactions` ADD CONSTRAINT `childcare_transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `childcare_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_rewards` ADD CONSTRAINT `childcare_rewards_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `childcare_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_rules` ADD CONSTRAINT `childcare_rules_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `childcare_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
