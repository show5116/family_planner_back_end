-- CreateTable
CREATE TABLE `routine_groups` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `emoji` VARCHAR(10) NULL,
    `color` VARCHAR(7) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `routine_groups_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `routines` ADD COLUMN `groupId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `routines_groupId_idx` ON `routines`(`groupId`);

-- AddForeignKey
ALTER TABLE `routine_groups` ADD CONSTRAINT `routine_groups_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routines` ADD CONSTRAINT `routines_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `routine_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
