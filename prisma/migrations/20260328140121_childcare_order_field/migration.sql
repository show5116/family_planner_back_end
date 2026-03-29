-- AlterTable
ALTER TABLE `childcare_rules` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `childcare_shop_items` ADD COLUMN `order` INTEGER NOT NULL DEFAULT 0;
