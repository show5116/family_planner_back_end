-- CreateEnum: TaskStatus
-- 기존 isCompleted Boolean → status Enum 변환 (양산 데이터 유지)

-- 1. TaskStatus enum 타입 생성 및 status 컬럼 추가
ALTER TABLE `tasks` ADD COLUMN `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'HOLD', 'DROP', 'FAILED') NOT NULL DEFAULT 'PENDING';

-- 2. 기존 isCompleted 데이터를 status로 마이그레이션
UPDATE `tasks` SET `status` = 'COMPLETED' WHERE `isCompleted` = true;
UPDATE `tasks` SET `status` = 'PENDING' WHERE `isCompleted` = false;

-- 3. 기존 isCompleted 컬럼 삭제
ALTER TABLE `tasks` DROP COLUMN `isCompleted`;

-- 4. 인덱스 교체 (isCompleted → status)
CREATE INDEX `tasks_status_idx` ON `tasks`(`status`);
