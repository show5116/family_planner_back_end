-- 그룹 챌린지 (기간제 공동 목표) 신규 (6차)

CREATE TABLE `routine_challenges` (
  `id`          VARCHAR(191) NOT NULL,
  `groupId`     VARCHAR(191) NOT NULL,
  `createdBy`   VARCHAR(191) NOT NULL,
  `title`       VARCHAR(50)  NOT NULL,
  `description` VARCHAR(200) NULL,
  `startDate`   DATE         NOT NULL,
  `endDate`     DATE         NOT NULL,
  `targetCount` INT          NOT NULL,
  `reward`      VARCHAR(100) NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `routine_challenges_groupId_idx`(`groupId`)
) DEFAULT CHARACTER SET utf8mb4;

CREATE TABLE `routine_challenge_participants` (
  `id`          VARCHAR(191) NOT NULL,
  `challengeId` VARCHAR(191) NOT NULL,
  `userId`      VARCHAR(191) NOT NULL,
  `routineId`   VARCHAR(191) NOT NULL,
  `joinedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `routine_challenge_participants_challengeId_userId_key`(`challengeId`, `userId`),
  INDEX `routine_challenge_participants_challengeId_idx`(`challengeId`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `routine_challenges`
  ADD CONSTRAINT `routine_challenges_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_challenges`
  ADD CONSTRAINT `routine_challenges_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `routine_challenge_participants`
  ADD CONSTRAINT `routine_challenge_participants_challengeId_fkey`
  FOREIGN KEY (`challengeId`) REFERENCES `routine_challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_challenge_participants`
  ADD CONSTRAINT `routine_challenge_participants_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_challenge_participants`
  ADD CONSTRAINT `routine_challenge_participants_routineId_fkey`
  FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
