-- CreateTable
CREATE TABLE `expenses` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `category` ENUM('TRANSPORTATION', 'FOOD', 'LEISURE', 'LIVING', 'MEDICAL', 'EDUCATION', 'OTHER') NOT NULL,
    `date` DATE NOT NULL,
    `description` VARCHAR(200) NULL,
    `paymentMethod` ENUM('CARD', 'CASH', 'TRANSFER') NULL,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expenses_groupId_date_idx`(`groupId`, `date` DESC),
    INDEX `expenses_userId_idx`(`userId`),
    INDEX `expenses_category_idx`(`category`),
    INDEX `expenses_date_idx`(`date` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `category` ENUM('TRANSPORTATION', 'FOOD', 'LEISURE', 'LIVING', 'MEDICAL', 'EDUCATION', 'OTHER') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `month` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_groupId_month_idx`(`groupId`, `month`),
    UNIQUE INDEX `budgets_groupId_category_month_key`(`groupId`, `category`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `member_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
