-- 출시 전(실사용자 데이터 없음) 배지 체계를 습관 개별 단위 -> 일일 목표(유저 단위) 기준으로 교체.
-- 기존 배지 획득 이력/카탈로그를 전부 삭제하고 스키마를 재정의한다.

-- 기존 데이터 삭제 (FK 순서상 자식 먼저)
DELETE FROM `user_routine_badges`;
DELETE FROM `routine_badges`;

-- UserRoutineBadge: routineId 컬럼 및 관련 제약 제거
ALTER TABLE `user_routine_badges` DROP FOREIGN KEY `user_routine_badges_routineId_fkey`;
DROP INDEX `user_routine_badges_userId_badgeId_routineId_key` ON `user_routine_badges`;
DROP INDEX `user_routine_badges_routineId_idx` ON `user_routine_badges`;
ALTER TABLE `user_routine_badges` DROP COLUMN `routineId`;

-- 신규 유니크 제약: 배지는 유저당 한 번만 획득 가능
CREATE UNIQUE INDEX `user_routine_badges_userId_badgeId_key` ON `user_routine_badges`(`userId`, `badgeId`);

-- BadgeCriteriaType enum 교체: 습관 개별 기준 -> 일일 목표 기준
ALTER TABLE `routine_badges` MODIFY COLUMN `criteriaType` ENUM('GOAL_STREAK_DAYS', 'GOAL_TOTAL_DAYS', 'GOAL_PERFECT_WEEK') NOT NULL;
