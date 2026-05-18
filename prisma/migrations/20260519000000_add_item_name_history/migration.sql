-- 냉장고/장보기 자동완성용 이름 이력 테이블
CREATE TABLE `item_name_histories` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `item_name_histories_groupId_name_key`(`groupId`, `name`),
  INDEX `item_name_histories_groupId_name_idx`(`groupId`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `item_name_histories` ADD CONSTRAINT `item_name_histories_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
