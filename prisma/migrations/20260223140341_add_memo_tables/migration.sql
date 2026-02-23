-- CreateTable
CREATE TABLE `memos` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `format` ENUM('MARKDOWN', 'HTML', 'PLAIN') NOT NULL DEFAULT 'MARKDOWN',
    `category` VARCHAR(50) NULL,
    `visibility` ENUM('PRIVATE', 'GROUP') NOT NULL DEFAULT 'PRIVATE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `memos_userId_createdAt_idx`(`userId`, `createdAt` DESC),
    INDEX `memos_groupId_createdAt_idx`(`groupId`, `createdAt` DESC),
    INDEX `memos_visibility_idx`(`visibility`),
    INDEX `memos_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memo_tags` (
    `id` VARCHAR(191) NOT NULL,
    `memoId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `color` VARCHAR(7) NULL,

    INDEX `memo_tags_memoId_idx`(`memoId`),
    INDEX `memo_tags_name_idx`(`name`),
    UNIQUE INDEX `memo_tags_memoId_name_key`(`memoId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memo_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `memoId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memo_attachments_memoId_idx`(`memoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `memos` ADD CONSTRAINT `memos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memos` ADD CONSTRAINT `memos_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memo_tags` ADD CONSTRAINT `memo_tags_memoId_fkey` FOREIGN KEY (`memoId`) REFERENCES `memos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memo_attachments` ADD CONSTRAINT `memo_attachments_memoId_fkey` FOREIGN KEY (`memoId`) REFERENCES `memos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
