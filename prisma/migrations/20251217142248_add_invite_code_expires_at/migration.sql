/*
  Warnings:

  - Added the required column `inviteCodeExpiresAt` to the `groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- 기존 레코드에는 현재 시간 + 7일을 기본값으로 설정
ALTER TABLE `groups` ADD COLUMN `inviteCodeExpiresAt` DATETIME(3) NOT NULL DEFAULT (DATE_ADD(NOW(), INTERVAL 7 DAY));

-- 기본값 제거 (향후 레코드는 명시적으로 값을 설정해야 함)
ALTER TABLE `groups` ALTER COLUMN `inviteCodeExpiresAt` DROP DEFAULT;
