-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `accounts_groupId_sortOrder_idx` ON `accounts`(`groupId`, `sortOrder`);
