/*
  Warnings:

  - You are about to alter the column `code` on the `permissions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(3))`.
  - You are about to alter the column `category` on the `permissions` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `permissions` MODIFY `code` ENUM('INVITE_MEMBER', 'DELETE_GROUP', 'UPDATE_GROUP', 'MANAGE_ROLE', 'MANAGE_MEMBER') NOT NULL,
    MODIFY `category` ENUM('GROUP') NOT NULL DEFAULT 'GROUP';
