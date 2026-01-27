-- AlterTable: Add category and viewCount columns
ALTER TABLE `announcements` ADD COLUMN `category` ENUM('ANNOUNCEMENT', 'EVENT', 'UPDATE') NOT NULL;
ALTER TABLE `announcements` ADD COLUMN `viewCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `announcements_category_idx` ON `announcements`(`category`);
