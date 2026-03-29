-- CreateTable
CREATE TABLE `childcare_savings_plans` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `monthlyAmount` INTEGER NOT NULL,
    `interestRate` DECIMAL(5, 2) NOT NULL,
    `interestType` ENUM('SIMPLE', 'COMPOUND') NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'MATURED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `maturedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `childcare_savings_plans_accountId_key`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `childcare_savings_plans` ADD CONSTRAINT `childcare_savings_plans_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `childcare_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
