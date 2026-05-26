-- CreateTable
CREATE TABLE `merchants` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `merchants_groupId_idx`(`groupId`),
    INDEX `merchants_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `merchantId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `expenses_merchantId_idx` ON `expenses`(`merchantId`);

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
