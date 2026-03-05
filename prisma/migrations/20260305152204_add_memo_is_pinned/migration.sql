-- AlterTable
ALTER TABLE `memos` ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `memos_userId_isPinned_idx` ON `memos`(`userId`, `isPinned`);
