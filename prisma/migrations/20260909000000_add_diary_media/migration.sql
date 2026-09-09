-- CreateTable
CREATE TABLE `diary_media` (
    `id` VARCHAR(191) NOT NULL,
    `diaryId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO') NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED') NOT NULL DEFAULT 'PENDING',
    `storageKey` VARCHAR(500) NOT NULL,
    `thumbnailKey` VARCHAR(500) NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `declaredSize` INTEGER NOT NULL,
    `fileSize` INTEGER NULL,
    `originalSize` INTEGER NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `durationMs` INTEGER NULL,
    `isOriginal` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `reservedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `diary_media_userId_uploadedAt_idx`(`userId`, `uploadedAt`),
    INDEX `diary_media_userId_deletedAt_idx`(`userId`, `deletedAt`),
    INDEX `diary_media_userId_status_reservedAt_idx`(`userId`, `status`, `reservedAt`),
    INDEX `diary_media_diaryId_sortOrder_idx`(`diaryId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `diary_media` ADD CONSTRAINT `diary_media_diaryId_fkey` FOREIGN KEY (`diaryId`) REFERENCES `diaries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diary_media` ADD CONSTRAINT `diary_media_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
