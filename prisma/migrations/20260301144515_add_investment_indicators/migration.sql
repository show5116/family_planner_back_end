-- CreateTable
CREATE TABLE `indicators` (
    `id` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameKo` VARCHAR(100) NOT NULL,
    `category` ENUM('INDEX', 'CURRENCY', 'COMMODITY', 'BOND', 'VOLATILITY', 'CRYPTO', 'MACRO') NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `indicators_symbol_key`(`symbol`),
    INDEX `indicators_category_idx`(`category`),
    INDEX `indicators_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indicator_prices` (
    `id` VARCHAR(191) NOT NULL,
    `indicatorId` VARCHAR(191) NOT NULL,
    `price` DECIMAL(20, 6) NOT NULL,
    `prevPrice` DECIMAL(20, 6) NULL,
    `change` DECIMAL(20, 6) NULL,
    `changeRate` DECIMAL(10, 4) NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `indicator_prices_indicatorId_recordedAt_idx`(`indicatorId`, `recordedAt` DESC),
    INDEX `indicator_prices_recordedAt_idx`(`recordedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indicator_bookmarks` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `indicatorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `indicator_bookmarks_userId_idx`(`userId`),
    UNIQUE INDEX `indicator_bookmarks_userId_indicatorId_key`(`userId`, `indicatorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `indicator_prices` ADD CONSTRAINT `indicator_prices_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicator_bookmarks` ADD CONSTRAINT `indicator_bookmarks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indicator_bookmarks` ADD CONSTRAINT `indicator_bookmarks_indicatorId_fkey` FOREIGN KEY (`indicatorId`) REFERENCES `indicators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
