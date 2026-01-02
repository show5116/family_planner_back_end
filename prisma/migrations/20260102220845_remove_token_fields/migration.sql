-- DropIndex
DROP INDEX `users_emailVerificationToken_idx` ON `users`;

-- DropIndex
DROP INDEX `users_passwordResetToken_idx` ON `users`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `emailVerificationToken`,
    DROP COLUMN `emailVerificationExpires`,
    DROP COLUMN `passwordResetToken`,
    DROP COLUMN `passwordResetExpires`;
