-- 루틴 공유 구조 개편: 습관 단위(routine×group) → 사용자 단위(user×group) (5차)

-- 1) 신규 테이블: 사용자×그룹 공유
CREATE TABLE `routine_group_shares` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `routine_group_shares_userId_groupId_key`(`userId`, `groupId`),
  INDEX `routine_group_shares_groupId_idx`(`groupId`)
) DEFAULT CHARACTER SET utf8mb4;

-- 2) Routine.isPrivate 컬럼 추가 (기본 공개)
ALTER TABLE `routines` ADD COLUMN `isPrivate` BOOLEAN NOT NULL DEFAULT false;

-- 3) 의사 보존 마이그레이션: 습관을 1개라도 A그룹에 공유했던 사용자는
--    A그룹 전체에 대해 RoutineGroupShare 생성 (유니크 충돌은 무시)
INSERT IGNORE INTO `routine_group_shares` (`id`, `userId`, `groupId`, `createdAt`)
SELECT DISTINCT UUID(), r.`userId`, rs.`groupId`, NOW(3)
FROM `routine_shares` rs
JOIN `routines` r ON r.`id` = rs.`routineId`;

-- 4) FK 제약 추가
ALTER TABLE `routine_group_shares`
  ADD CONSTRAINT `routine_group_shares_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_group_shares`
  ADD CONSTRAINT `routine_group_shares_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) 기존 습관 단위 공유 테이블 삭제
DROP TABLE `routine_shares`;
