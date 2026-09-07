-- 무료 체험 중 결제 시 남아 있던 체험 잔여일 (최초 결제 때 1회만 적립, free로 내려가면 0으로 초기화)
ALTER TABLE `users` ADD COLUMN `trialCarryoverDays` INTEGER NOT NULL DEFAULT 0;
