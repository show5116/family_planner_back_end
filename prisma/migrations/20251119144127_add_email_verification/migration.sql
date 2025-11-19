-- AlterTable
ALTER TABLE `users` ADD COLUMN `emailVerificationExpires` DATETIME(3) NULL,
    ADD COLUMN `emailVerificationToken` VARCHAR(255) NULL,
    ADD COLUMN `isEmailVerified` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `users_emailVerificationToken_idx` ON `users`(`emailVerificationToken`);
