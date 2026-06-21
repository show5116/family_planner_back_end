-- CreateTable anniversaries
CREATE TABLE IF NOT EXISTS `anniversaries` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `emoji` VARCHAR(10) NULL,
  `milestoneConfig` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `anniversaries_groupId_idx` (`groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable tasks: add anniversary-related columns
ALTER TABLE `tasks`
  ADD COLUMN `anniversaryId` VARCHAR(191) NULL,
  ADD COLUMN `offsetDays` INT NULL,
  ADD COLUMN `offsetType` ENUM('DAYS', 'YEARS') NULL,
  ADD INDEX `tasks_anniversaryId_idx` (`anniversaryId`);

-- AddForeignKey anniversaries → member_groups
ALTER TABLE `anniversaries` ADD CONSTRAINT `anniversaries_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey tasks → anniversaries (CASCADE)
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_anniversaryId_fkey`
  FOREIGN KEY (`anniversaryId`) REFERENCES `anniversaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
