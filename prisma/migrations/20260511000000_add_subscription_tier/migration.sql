-- AlterTable
ALTER TABLE `users` ADD COLUMN `subscriptionTier` ENUM('free', 'ad_free', 'premium') NOT NULL DEFAULT 'free',
                    ADD COLUMN `subscriptionExpiresAt` DATETIME(3) NULL,
                    ADD COLUMN `inAppPurchaseToken` VARCHAR(500) NULL;
