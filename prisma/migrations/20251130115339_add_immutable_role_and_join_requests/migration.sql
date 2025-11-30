-- AlterTable
ALTER TABLE `roles` ADD COLUMN `isImmutable` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `group_join_requests` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `type` ENUM('REQUEST', 'INVITE') NOT NULL DEFAULT 'REQUEST',
    `email` VARCHAR(255) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_join_requests_groupId_idx`(`groupId`),
    INDEX `group_join_requests_email_idx`(`email`),
    INDEX `group_join_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `group_join_requests` ADD CONSTRAINT `group_join_requests_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
