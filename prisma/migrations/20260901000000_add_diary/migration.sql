-- CreateTable
CREATE TABLE `diaries` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `date` DATE NOT NULL,
    `title` VARCHAR(200) NULL,
    `content` TEXT NOT NULL,
    `plainText` TEXT NULL,
    `format` ENUM('DELTA', 'PLAIN', 'MARKDOWN') NOT NULL DEFAULT 'DELTA',
    `visibility` ENUM('PRIVATE', 'GROUP') NOT NULL DEFAULT 'PRIVATE',
    `mood` VARCHAR(20) NULL,
    `weather` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `diaries_userId_date_idx`(`userId`, `date` DESC),
    INDEX `diaries_groupId_date_idx`(`groupId`, `date` DESC),
    INDEX `diaries_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `diaries_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diaries` ADD CONSTRAINT `diaries_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
