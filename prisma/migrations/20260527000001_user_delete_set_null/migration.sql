-- User 계정 삭제 시 작성자/히스토리 참조를 NULL로 처리 (SetNull)
-- 대상: announcements.authorId, questions.userId, answers.adminId,
--       task_histories.userId, task_skips.createdBy, childcare_transactions.createdBy

-- announcements.authorId: NOT NULL → NULL + FK SetNull
ALTER TABLE `announcements` MODIFY COLUMN `authorId` VARCHAR(191) NULL;
ALTER TABLE `announcements` DROP FOREIGN KEY `announcements_authorId_fkey`;
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_authorId_fkey`
  FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- questions.userId: NOT NULL → NULL + FK SetNull
ALTER TABLE `questions` MODIFY COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `questions` DROP FOREIGN KEY `questions_userId_fkey`;
ALTER TABLE `questions` ADD CONSTRAINT `questions_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- answers.adminId: NOT NULL → NULL + FK SetNull
ALTER TABLE `answers` MODIFY COLUMN `adminId` VARCHAR(191) NULL;
ALTER TABLE `answers` DROP FOREIGN KEY `answers_adminId_fkey`;
ALTER TABLE `answers` ADD CONSTRAINT `answers_adminId_fkey`
  FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- task_histories.userId: NOT NULL → NULL + FK SetNull
ALTER TABLE `task_histories` MODIFY COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `task_histories` DROP FOREIGN KEY `task_histories_userId_fkey`;
ALTER TABLE `task_histories` ADD CONSTRAINT `task_histories_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- task_skips.createdBy: NOT NULL → NULL + FK SetNull
ALTER TABLE `task_skips` MODIFY COLUMN `createdBy` VARCHAR(191) NULL;
ALTER TABLE `task_skips` DROP FOREIGN KEY `task_skips_createdBy_fkey`;
ALTER TABLE `task_skips` ADD CONSTRAINT `task_skips_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- childcare_transactions.createdBy: NOT NULL → NULL + FK SetNull
ALTER TABLE `childcare_transactions` MODIFY COLUMN `createdBy` VARCHAR(191) NULL;
ALTER TABLE `childcare_transactions` DROP FOREIGN KEY `childcare_transactions_createdBy_fkey`;
ALTER TABLE `childcare_transactions` ADD CONSTRAINT `childcare_transactions_createdBy_fkey`
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
