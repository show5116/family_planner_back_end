-- CreateTable
CREATE TABLE `global_expiry_presets` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `keyword` VARCHAR(100) NOT NULL,
    `storageType` ENUM('FRIDGE', 'FREEZER', 'PANTRY') NOT NULL,
    `defaultDays` INTEGER NOT NULL,

    UNIQUE INDEX `global_expiry_presets_keyword_storageType_key`(`keyword`, `storageType`),
    INDEX `global_expiry_presets_keyword_idx`(`keyword`),
    INDEX `global_expiry_presets_category_storageType_idx`(`category`, `storageType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_expiry_presets` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `storageType` ENUM('FRIDGE', 'FREEZER', 'PANTRY') NOT NULL,
    `customDays` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `group_expiry_presets_groupId_category_storageType_key`(`groupId`, `category`, `storageType`),
    INDEX `group_expiry_presets_groupId_idx`(`groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `group_expiry_presets` ADD CONSTRAINT `group_expiry_presets_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
