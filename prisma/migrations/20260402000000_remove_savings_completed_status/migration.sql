-- Migrate COMPLETED → ACTIVE before removing enum value
UPDATE `SavingsGoal` SET `status` = 'ACTIVE' WHERE `status` = 'COMPLETED';

-- AlterTable: Remove COMPLETED from SavingsGoal_status enum
ALTER TABLE `SavingsGoal` MODIFY COLUMN `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE';
