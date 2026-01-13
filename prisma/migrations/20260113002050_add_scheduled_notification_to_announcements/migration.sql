-- AlterTable
ALTER TABLE `announcements`
ADD COLUMN `scheduledNotificationAt` DATETIME(3) NULL,
ADD COLUMN `notificationSentAt` DATETIME(3) NULL,
ADD INDEX `announcements_scheduledNotificationAt_idx`(`scheduledNotificationAt`);
