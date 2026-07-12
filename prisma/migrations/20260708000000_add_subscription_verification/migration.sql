-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('ANDROID', 'IOS') NOT NULL,
    `productId` VARCHAR(200) NOT NULL,
    `originalTransactionId` VARCHAR(500) NOT NULL,
    `latestTransactionId` VARCHAR(500) NULL,
    `tier` ENUM('free', 'ad_free', 'premium') NOT NULL,
    `status` ENUM('active', 'expired', 'canceled', 'grace_period', 'revoked') NOT NULL DEFAULT 'active',
    `expiresAt` DATETIME(3) NULL,
    `autoRenewing` BOOLEAN NOT NULL DEFAULT true,
    `lastVerifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_userId_key`(`userId`),
    INDEX `subscriptions_originalTransactionId_idx`(`originalTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `platform` ENUM('ANDROID', 'IOS') NOT NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `originalTransactionId` VARCHAR(500) NULL,
    `rawPayload` JSON NOT NULL,
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_events_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
