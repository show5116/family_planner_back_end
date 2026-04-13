-- AlterTable: make categoryId nullable on tasks
ALTER TABLE `tasks` MODIFY COLUMN `categoryId` VARCHAR(191) NULL;
