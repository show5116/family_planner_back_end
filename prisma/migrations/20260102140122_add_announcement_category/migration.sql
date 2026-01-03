-- AlterTable: Add category column with default value
ALTER TABLE `announcements` ADD COLUMN `category` ENUM('ANNOUNCEMENT', 'EVENT', 'UPDATE') NOT NULL DEFAULT 'ANNOUNCEMENT';

-- CreateIndex
CREATE INDEX `announcements_category_idx` ON `announcements`(`category`);
