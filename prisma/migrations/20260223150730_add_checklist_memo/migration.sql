-- AlterTable
ALTER TABLE `memos` ADD COLUMN `type` ENUM('NOTE', 'CHECKLIST') NOT NULL DEFAULT 'NOTE';

-- CreateTable
CREATE TABLE `checklist_items` (
    `id` VARCHAR(191) NOT NULL,
    `memoId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(300) NOT NULL,
    `isChecked` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `checklist_items_memoId_order_idx`(`memoId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_memoId_fkey` FOREIGN KEY (`memoId`) REFERENCES `memos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
