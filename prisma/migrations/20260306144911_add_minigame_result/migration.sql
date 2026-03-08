-- CreateTable
CREATE TABLE `minigame_results` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `gameType` ENUM('LADDER', 'ROULETTE') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `participants` JSON NOT NULL,
    `options` JSON NOT NULL,
    `result` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `minigame_results_groupId_createdAt_idx`(`groupId`, `createdAt` DESC),
    INDEX `minigame_results_groupId_gameType_idx`(`groupId`, `gameType`),
    INDEX `minigame_results_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
