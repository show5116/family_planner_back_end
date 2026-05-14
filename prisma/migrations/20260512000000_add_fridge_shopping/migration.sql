-- 냉장고 & 스마트 장보기 기능 추가
-- StorageType enum
ALTER TABLE `storage_locations` ENGINE=InnoDB;

-- notification enum에 FRIDGE 추가는 Prisma가 db push로 처리

-- StorageLocation
CREATE TABLE `storage_locations` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `type` ENUM('FRIDGE','FREEZER','PANTRY') NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `storage_locations_groupId_idx`(`groupId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `storage_locations` ADD CONSTRAINT `storage_locations_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- FridgeItem
CREATE TABLE `fridge_items` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `storageLocationId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(20) NULL,
  `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NULL,
  `alertDaysBefore` INTEGER NOT NULL DEFAULT 3,
  `memo` VARCHAR(200) NULL,
  `frequentItemId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `fridge_items_groupId_idx`(`groupId`),
  INDEX `fridge_items_storageLocationId_idx`(`storageLocationId`),
  INDEX `fridge_items_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `fridge_items` ADD CONSTRAINT `fridge_items_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `fridge_items` ADD CONSTRAINT `fridge_items_storageLocationId_fkey` FOREIGN KEY (`storageLocationId`) REFERENCES `storage_locations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `fridge_items` ADD CONSTRAINT `fridge_items_frequentItemId_fkey` FOREIGN KEY (`frequentItemId`) REFERENCES `frequent_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- FrequentItem
CREATE TABLE `frequent_items` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `defaultUnit` VARCHAR(20) NULL,
  `autoAdd` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `frequent_items_groupId_name_key`(`groupId`, `name`),
  INDEX `frequent_items_groupId_idx`(`groupId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `frequent_items` ADD CONSTRAINT `frequent_items_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ShoppingCart
CREATE TABLE `shopping_carts` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `shopping_carts_groupId_key`(`groupId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shopping_carts` ADD CONSTRAINT `shopping_carts_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ShoppingCartItem
CREATE TABLE `shopping_cart_items` (
  `id` VARCHAR(191) NOT NULL,
  `cartId` VARCHAR(191) NOT NULL,
  `frequentItemId` VARCHAR(191) NULL,
  `name` VARCHAR(100) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(20) NULL,
  `isChecked` BOOLEAN NOT NULL DEFAULT false,
  `memo` VARCHAR(200) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `shopping_cart_items_cartId_idx`(`cartId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shopping_cart_items` ADD CONSTRAINT `shopping_cart_items_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `shopping_carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `shopping_cart_items` ADD CONSTRAINT `shopping_cart_items_frequentItemId_fkey` FOREIGN KEY (`frequentItemId`) REFERENCES `frequent_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ShoppingHistory
CREATE TABLE `shopping_histories` (
  `id` VARCHAR(191) NOT NULL,
  `groupId` VARCHAR(191) NOT NULL,
  `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `shopping_histories_groupId_idx`(`groupId`),
  INDEX `shopping_histories_completedAt_idx`(`completedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shopping_histories` ADD CONSTRAINT `shopping_histories_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ShoppingHistoryItem
CREATE TABLE `shopping_history_items` (
  `id` VARCHAR(191) NOT NULL,
  `historyId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `quantity` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(20) NULL,
  `transferredToFridge` BOOLEAN NOT NULL DEFAULT false,
  `fridgeItemId` VARCHAR(191) NULL,
  INDEX `shopping_history_items_historyId_idx`(`historyId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shopping_history_items` ADD CONSTRAINT `shopping_history_items_historyId_fkey` FOREIGN KEY (`historyId`) REFERENCES `shopping_histories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
