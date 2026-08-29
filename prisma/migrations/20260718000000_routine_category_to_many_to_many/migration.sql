-- CreateTable
CREATE TABLE `routine_category_links` (
    `id` VARCHAR(191) NOT NULL,
    `routineId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `routine_category_links_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `routine_category_links_routineId_categoryId_key`(`routineId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 기존 단일 categoryId 값을 조인 테이블 행으로 백필 (컬럼 드롭 전에 실행)
INSERT INTO `routine_category_links` (`id`, `routineId`, `categoryId`, `createdAt`)
SELECT UUID(), `id`, `categoryId`, NOW()
FROM `routines`
WHERE `categoryId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `routines` DROP FOREIGN KEY `routines_categoryId_fkey`;

-- DropIndex
DROP INDEX `routines_categoryId_idx` ON `routines`;

-- AlterTable
ALTER TABLE `routines` DROP COLUMN `categoryId`;

-- AddForeignKey
ALTER TABLE `routine_category_links` ADD CONSTRAINT `routine_category_links_routineId_fkey` FOREIGN KEY (`routineId`) REFERENCES `routines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `routine_category_links` ADD CONSTRAINT `routine_category_links_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `routine_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
