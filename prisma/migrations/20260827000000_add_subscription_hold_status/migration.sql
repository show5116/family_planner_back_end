-- AlterEnum
-- 계정 보류(on_hold)와 일시중지(paused) 상태 추가
ALTER TABLE `subscriptions` MODIFY `status` ENUM('active', 'expired', 'canceled', 'grace_period', 'revoked', 'on_hold', 'paused') NOT NULL DEFAULT 'active';
