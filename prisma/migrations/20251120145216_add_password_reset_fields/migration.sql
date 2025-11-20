-- AlterTable
ALTER TABLE `users` ADD COLUMN `passwordResetExpires` DATETIME(3) NULL,
    ADD COLUMN `passwordResetToken` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `users_passwordResetToken_idx` ON `users`(`passwordResetToken`);
