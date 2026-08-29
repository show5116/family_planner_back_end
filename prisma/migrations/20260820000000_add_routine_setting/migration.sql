-- CreateTable
CREATE TABLE `routine_settings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dailyGoalMode` ENUM('ALL', 'COUNT') NOT NULL DEFAULT 'ALL',
    `dailyGoalCount` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routine_settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable
CREATE TABLE `routine_setting_histories` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dailyGoalMode` ENUM('ALL', 'COUNT') NOT NULL,
    `dailyGoalCount` INTEGER NULL,
    `effectiveFrom` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routine_setting_histories_userId_effectiveFrom_idx`(`userId`, `effectiveFrom`),
    UNIQUE INDEX `routine_setting_histories_userId_effectiveFrom_key`(`userId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- AddForeignKey
ALTER TABLE `routine_settings` ADD CONSTRAINT `routine_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routine_setting_histories` ADD CONSTRAINT `routine_setting_histories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
