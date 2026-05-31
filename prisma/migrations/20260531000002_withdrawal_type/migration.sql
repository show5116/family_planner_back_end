-- WithdrawalType enum 추가 및 account_withdrawals에 type 컬럼 추가
ALTER TABLE `account_withdrawals`
  ADD COLUMN `type` ENUM('PRINCIPAL', 'PROFIT') NOT NULL DEFAULT 'PRINCIPAL';
