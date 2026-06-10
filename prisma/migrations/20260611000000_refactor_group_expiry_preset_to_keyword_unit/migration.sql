-- 기존 그룹 커스텀 프리셋 전체 삭제 (카테고리 단위 → 품목 단위 구조 변경)
DELETE FROM `group_expiry_presets`;

-- 기존 컬럼/인덱스/유니크 제약 제거
ALTER TABLE `group_expiry_presets` DROP INDEX `group_expiry_presets_groupId_category_storageType_key`;
ALTER TABLE `group_expiry_presets` DROP COLUMN `category`;
ALTER TABLE `group_expiry_presets` DROP COLUMN `storageType`;

-- globalPresetId 컬럼 추가 및 FK 설정
ALTER TABLE `group_expiry_presets` ADD COLUMN `globalPresetId` VARCHAR(191) NOT NULL;
ALTER TABLE `group_expiry_presets` ADD CONSTRAINT `group_expiry_presets_globalPresetId_fkey`
  FOREIGN KEY (`globalPresetId`) REFERENCES `global_expiry_presets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 새 유니크 제약 추가
ALTER TABLE `group_expiry_presets` ADD CONSTRAINT `group_expiry_presets_groupId_globalPresetId_key`
  UNIQUE (`groupId`, `globalPresetId`);
