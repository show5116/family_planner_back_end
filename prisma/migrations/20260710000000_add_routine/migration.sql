-- CreateTable
CREATE TABLE `routines` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `emoji` VARCHAR(10) NULL,
    `color` VARCHAR(7) NULL,
    `frequencyType` ENUM('WEEKLY_COUNT', 'DAILY', 'DAYS_OF_WEEK') NOT NULL DEFAULT 'WEEKLY_COUNT',
    `targetCount` INTEGER NULL,
    `targetDays` JSON NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `routines_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `routines_userId_sortOrder_idx`(`userId`, `sortOrder`),
    INDEX `routines_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable
CREATE TABLE `routine_logs` (
    `id` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `checkedDate` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routine_logs_routineId_checkedDate_idx`(`routineId`, `checkedDate`),
    INDEX `routine_logs_userId_checkedDate_idx`(`userId`, `checkedDate`),
    UNIQUE INDEX `routine_logs_routineId_checkedDate_key`(`routineId`, `checkedDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable
CREATE TABLE `routine_shares` (
    `id` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routine_shares_groupId_idx`(`groupId`),
    UNIQUE INDEX `routine_shares_routineId_groupId_key`(`routineId`, `groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- AddForeignKey
ALTER TABLE `routines` ADD CONSTRAINT `routines_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routine_logs` ADD CONSTRAINT `routine_logs_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routine_shares` ADD CONSTRAINT `routine_shares_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routine_shares` ADD CONSTRAINT `routine_shares_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
