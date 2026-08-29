-- CreateTable
CREATE TABLE `routine_categories` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(50) NOT NULL,
    `emoji` VARCHAR(10) NULL,
    `color` VARCHAR(7) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `routine_categories_userId_deletedAt_idx`(`userId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routine_pauses` (
    `id` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `pausedFrom` DATE NOT NULL,
    `pausedTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routine_pauses_routineId_pausedFrom_idx`(`routineId`, `pausedFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: routines에 신규 컬럼 추가 (전부 nullable 또는 기본값 있음 - 백필 안전)
ALTER TABLE `routines`
    ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `memo` VARCHAR(500) NULL,
    ADD COLUMN `importance` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `timeFilter` ENUM('MORNING', 'AFTERNOON', 'EVENING') NULL,
    ADD COLUMN `weeklyMode` ENUM('COUNT_ONLY', 'FIXED_DAYS') NULL,
    ADD COLUMN `recordType` ENUM('BOOLEAN', 'TEXT', 'TIME', 'NUMERIC') NOT NULL DEFAULT 'BOOLEAN',
    ADD COLUMN `status` ENUM('ACTIVE', 'PAUSED', 'ENDED') NOT NULL DEFAULT 'ACTIVE';

-- 기존 WEEKLY_COUNT/DAYS_OF_WEEK 루틴 백필: weeklyMode 지정 (COUNT_ONLY로 통일, targetCount는 그대로 유지)
UPDATE `routines` SET `weeklyMode` = 'COUNT_ONLY' WHERE `frequencyType` IN ('WEEKLY_COUNT', 'DAYS_OF_WEEK');

-- status 백필: isActive/deletedAt 기준
UPDATE `routines` SET `status` = 'ACTIVE' WHERE `isActive` = 1 AND `deletedAt` IS NULL;
UPDATE `routines` SET `status` = 'ENDED', `deletedAt` = COALESCE(`deletedAt`, NOW()) WHERE `isActive` = 0;

-- frequencyType enum 확장 (신규 값 포함) 후 구 값을 신규 값으로 리매핑, 이후 구 값 제거하며 최종 enum으로 좁힘
ALTER TABLE `routines` MODIFY COLUMN `frequencyType`
    ENUM('WEEKLY_COUNT', 'DAILY', 'DAYS_OF_WEEK', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'WEEKLY';
UPDATE `routines` SET `frequencyType` = 'WEEKLY' WHERE `frequencyType` IN ('WEEKLY_COUNT', 'DAYS_OF_WEEK');
ALTER TABLE `routines` MODIFY COLUMN `frequencyType`
    ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'WEEKLY';

-- isActive 컬럼 삭제 (status로 완전 대체)
DROP INDEX `routines_userId_isActive_idx` ON `routines`;
ALTER TABLE `routines` DROP COLUMN `isActive`;

-- AlterTable: routine_logs에 기록 타입별 값 컬럼 추가
ALTER TABLE `routine_logs`
    ADD COLUMN `textValue` VARCHAR(500) NULL,
    ADD COLUMN `numericValue` DECIMAL(10, 2) NULL,
    ADD COLUMN `timeValue` VARCHAR(5) NULL;

-- CreateIndex
CREATE INDEX `routines_categoryId_idx` ON `routines`(`categoryId`);
CREATE INDEX `routines_userId_status_idx` ON `routines`(`userId`, `status`);

-- AddForeignKey
ALTER TABLE `routines` ADD CONSTRAINT `routines_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `routine_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `routine_categories` ADD CONSTRAINT `routine_categories_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_pauses` ADD CONSTRAINT `routine_pauses_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
