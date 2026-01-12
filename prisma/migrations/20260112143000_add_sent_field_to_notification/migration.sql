-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `sent` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `notifications_sent_idx` ON `notifications`(`sent`);

-- AlterTable: sentAt 컬럼을 nullable로 변경하고 default 제거
ALTER TABLE `notifications` MODIFY COLUMN `sentAt` DATETIME(3) NULL;

-- AlterTable: createdAt 컬럼 추가
ALTER TABLE `notifications` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `notifications_createdAt_idx` ON `notifications`(`createdAt`);
