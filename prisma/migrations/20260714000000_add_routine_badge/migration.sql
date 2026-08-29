-- CreateTable
CREATE TABLE `routine_badges` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` VARCHAR(200) NULL,
    `iconEmoji` VARCHAR(10) NULL,
    `criteriaType` ENUM('STREAK_DAYS', 'STREAK_WEEKS', 'TOTAL_CHECKS') NOT NULL,
    `criteriaValue` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routine_badges_code_key`(`code`),
    INDEX `routine_badges_criteriaType_idx`(`criteriaType`),
    INDEX `routine_badges_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_routine_badges` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `badgeId` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NULL,
    `earnedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_routine_badges_userId_idx`(`userId`),
    INDEX `user_routine_badges_badgeId_idx`(`badgeId`),
    INDEX `user_routine_badges_routineId_idx`(`routineId`),
    UNIQUE INDEX `user_routine_badges_userId_badgeId_routineId_key`(`userId`, `badgeId`, `routineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_routine_badges` ADD CONSTRAINT `user_routine_badges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_routine_badges` ADD CONSTRAINT `user_routine_badges_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `routine_badges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_routine_badges` ADD CONSTRAINT `user_routine_badges_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: 배지 카탈로그 9종
INSERT INTO `routine_badges` (`id`, `code`, `title`, `description`, `iconEmoji`, `criteriaType`, `criteriaValue`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`) VALUES
(UUID(), 'STREAK_DAYS_7', '7일 연속 달성', '루틴을 7일 연속으로 체크했어요', '🔥', 'STREAK_DAYS', 7, 0, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'STREAK_DAYS_30', '30일 연속 달성', '루틴을 30일 연속으로 체크했어요', '🔥', 'STREAK_DAYS', 30, 1, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'STREAK_DAYS_100', '100일 연속 달성', '루틴을 100일 연속으로 체크했어요', '🏆', 'STREAK_DAYS', 100, 2, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'STREAK_WEEKS_4', '4주 연속 목표 달성', '4주 연속으로 주간 목표를 달성했어요', '⭐', 'STREAK_WEEKS', 4, 3, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'STREAK_WEEKS_12', '12주 연속 목표 달성', '12주 연속으로 주간 목표를 달성했어요', '🌟', 'STREAK_WEEKS', 12, 4, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'STREAK_WEEKS_52', '1년 연속 목표 달성', '52주 연속으로 주간 목표를 달성했어요', '👑', 'STREAK_WEEKS', 52, 5, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'TOTAL_CHECKS_50', '누적 50회 체크', '루틴을 총 50회 체크했어요', '✅', 'TOTAL_CHECKS', 50, 6, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'TOTAL_CHECKS_200', '누적 200회 체크', '루틴을 총 200회 체크했어요', '💯', 'TOTAL_CHECKS', 200, 7, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), 'TOTAL_CHECKS_500', '누적 500회 체크', '루틴을 총 500회 체크했어요', '💎', 'TOTAL_CHECKS', 500, 8, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
