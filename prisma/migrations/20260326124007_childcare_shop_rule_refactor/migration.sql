/*
  Warnings:

  - You are about to drop the column `penalty` on the `childcare_rules` table. All the data in the column will be lost.
  - You are about to drop the `childcare_rewards` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `points` to the `childcare_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `childcare_rules` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `childcare_rewards` DROP FOREIGN KEY `childcare_rewards_accountId_fkey`;

-- AlterTable
ALTER TABLE `childcare_rules` DROP COLUMN `penalty`,
    ADD COLUMN `points` INTEGER NOT NULL,
    ADD COLUMN `type` ENUM('PLUS', 'MINUS') NOT NULL;

-- DropTable
DROP TABLE `childcare_rewards`;

-- CreateTable
CREATE TABLE `childcare_shop_items` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `points` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `childcare_shop_items_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `childcare_shop_items` ADD CONSTRAINT `childcare_shop_items_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `childcare_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
