/*
  Warnings:

  - You are about to drop the column `childUserId` on the `childcare_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyAllowance` on the `childcare_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `savingsInterestRate` on the `childcare_accounts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[childId]` on the table `childcare_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `childId` to the `childcare_accounts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `childcare_accounts` DROP FOREIGN KEY `childcare_accounts_childUserId_fkey`;

-- DropIndex
DROP INDEX `childcare_accounts_childUserId_idx` ON `childcare_accounts`;

-- AlterTable
ALTER TABLE `childcare_accounts` DROP COLUMN `childUserId`,
    DROP COLUMN `monthlyAllowance`,
    DROP COLUMN `savingsInterestRate`,
    ADD COLUMN `childId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `children` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `parentUserId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `birthDate` DATE NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `children_groupId_idx`(`groupId`),
    INDEX `children_parentUserId_idx`(`parentUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_allowance_plans` (
    `id` VARCHAR(191) NOT NULL,
    `childId` VARCHAR(191) NOT NULL,
    `monthlyPoints` INTEGER NOT NULL,
    `payDay` INTEGER NOT NULL,
    `pointToMoneyRatio` INTEGER NOT NULL,
    `nextNegotiationDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `child_allowance_plans_childId_key`(`childId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `child_allowance_plan_histories` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `monthlyPoints` INTEGER NOT NULL,
    `payDay` INTEGER NOT NULL,
    `pointToMoneyRatio` INTEGER NOT NULL,
    `nextNegotiationDate` DATE NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `child_allowance_plan_histories_planId_changedAt_idx`(`planId`, `changedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `childcare_accounts_childId_key` ON `childcare_accounts`(`childId`);

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `childcare_accounts` ADD CONSTRAINT `childcare_accounts_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_allowance_plans` ADD CONSTRAINT `child_allowance_plans_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `child_allowance_plan_histories` ADD CONSTRAINT `child_allowance_plan_histories_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `child_allowance_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
