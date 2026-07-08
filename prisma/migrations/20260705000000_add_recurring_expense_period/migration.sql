-- AlterTable: recurring_expenses에 startDate, totalMonths 컬럼 추가
ALTER TABLE `recurring_expenses`
    ADD COLUMN `startDate` DATE NULL,
    ADD COLUMN `totalMonths` INTEGER NULL;
