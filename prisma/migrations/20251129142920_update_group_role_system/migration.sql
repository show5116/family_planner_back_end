/*
  Warnings:

  - You are about to drop the column `role` on the `group_members` table. All the data in the column will be lost.
  - You are about to alter the column `inviteCode` on the `groups` table. The data in that column could be lost. The data in that column will be cast from `VarChar(12)` to `VarChar(8)`.
  - Added the required column `roleId` to the `group_members` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `group_members` DROP COLUMN `role`,
    ADD COLUMN `customColor` VARCHAR(7) NULL,
    ADD COLUMN `roleId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `groups` ADD COLUMN `defaultColor` VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    MODIFY `inviteCode` VARCHAR(8) NOT NULL;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `isDefaultRole` BOOLEAN NOT NULL DEFAULT false,
    `permissions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `roles_groupId_idx`(`groupId`),
    UNIQUE INDEX `roles_name_groupId_key`(`name`, `groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `group_members_roleId_idx` ON `group_members`(`roleId`);

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
