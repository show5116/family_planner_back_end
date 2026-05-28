-- 환불 연결 지출 삭제 시 환불 입금도 함께 삭제 (SetNull → Cascade)
ALTER TABLE `expenses` DROP FOREIGN KEY `expenses_refundedExpenseId_fkey`;

ALTER TABLE `expenses` ADD CONSTRAINT `expenses_refundedExpenseId_fkey`
  FOREIGN KEY (`refundedExpenseId`) REFERENCES `expenses`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
