-- AlterTable: users에 lastLat, lastLon 추가
ALTER TABLE `users` ADD COLUMN `lastLat` DOUBLE NULL,
                    ADD COLUMN `lastLon` DOUBLE NULL;

-- AlterTable: notification_settings에 weatherAlertHour 추가
ALTER TABLE `notification_settings` ADD COLUMN `weatherAlertHour` INTEGER NOT NULL DEFAULT 7;

-- AlterEnum: notification_settings_category에 WEATHER 추가
ALTER TABLE `notification_settings` MODIFY COLUMN `category` ENUM('SCHEDULE','TODO','HOUSEHOLD','SAVINGS','ASSET','CHILDCARE','GROUP','SYSTEM','WEATHER') NOT NULL;

-- AlterEnum: notifications_category에 WEATHER 추가
ALTER TABLE `notifications` MODIFY COLUMN `category` ENUM('SCHEDULE','TODO','HOUSEHOLD','SAVINGS','ASSET','CHILDCARE','GROUP','SYSTEM','WEATHER') NOT NULL;
