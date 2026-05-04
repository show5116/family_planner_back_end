-- 기존 location 문자열 데이터를 JSON으로 변환
-- 1. 기존 데이터를 NULL로 초기화 (문자열 → JSON 직접 캐스팅 불가)
UPDATE `tasks` SET `location` = NULL WHERE `location` IS NOT NULL;

-- 2. 컬럼 타입 변경: VARCHAR(255) → JSON
ALTER TABLE `tasks` MODIFY COLUMN `location` JSON NULL;
