-- AlterTable: memos에서 type 컬럼 제거
ALTER TABLE `memos` DROP COLUMN `type`;

-- AlterTable: memos에 plainText, checkedCount, totalCount 추가 및 format에 DELTA 추가
ALTER TABLE `memos`
  ADD COLUMN `plainText` TEXT NULL,
  ADD COLUMN `checkedCount` INT NOT NULL DEFAULT 0,
  ADD COLUMN `totalCount` INT NOT NULL DEFAULT 0,
  MODIFY COLUMN `format` ENUM('MARKDOWN', 'HTML', 'PLAIN', 'DELTA') NOT NULL DEFAULT 'DELTA';

-- AlterTable: checklist_items 테이블 전체 제거
DROP TABLE IF EXISTS `checklist_items`;
