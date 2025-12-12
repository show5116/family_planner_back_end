-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `permissions_sortOrder_idx` ON `permissions`(`sortOrder`);

-- CreateIndex
CREATE INDEX `roles_sortOrder_idx` ON `roles`(`sortOrder`);
