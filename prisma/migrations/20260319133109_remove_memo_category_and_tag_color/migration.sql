/*
  Warnings:

  - You are about to drop the column `color` on the `memo_tags` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `memos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `memo_tags` DROP COLUMN `color`;

-- AlterTable
ALTER TABLE `memos` DROP COLUMN `category`;
