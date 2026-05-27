-- AlterTable
ALTER TABLE `expenses`
  ADD COLUMN `estimatedAmount` DECIMAL(10, 2) NULL,
  ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT true;
