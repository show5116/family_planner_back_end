-- AlterTable
ALTER TABLE `routines` ADD COLUMN `includeInDailyGoal` BOOLEAN NOT NULL DEFAULT true;

-- 기존 데이터 보정: 반복 주기를 반영하지 않던 1차 구현 문제 해결을 위해
-- DAILY만 포함(true) 유지, WEEKLY/MONTHLY는 기본 제외(false)로 전환
UPDATE `routines` SET `includeInDailyGoal` = false WHERE `frequencyType` IN ('WEEKLY', 'MONTHLY');
