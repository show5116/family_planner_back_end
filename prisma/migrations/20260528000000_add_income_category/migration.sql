-- AlterTable
ALTER TABLE `expenses`
  ADD COLUMN `incomeCategory` ENUM('SALARY','ALLOWANCE','CARRYOVER','BONUS','INTEREST','RENTAL','SIDE_INCOME','TRANSFER_IN','OTHER_INCOME') NULL;

-- CreateIndex
CREATE INDEX `expenses_incomeCategory_idx` ON `expenses`(`incomeCategory`);
