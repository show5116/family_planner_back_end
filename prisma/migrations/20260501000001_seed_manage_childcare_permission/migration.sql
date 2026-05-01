-- MANAGE_CHILDCARE permission 레코드 삽입 (이미 존재하면 무시)
INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `category`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES (UUID(), 'MANAGE_CHILDCARE', '자녀 관리', '육아 포인트 계정 및 자녀 프로필을 관리합니다', 'CHILDCARE', true, 20, NOW(), NOW());

-- OWNER 역할에 MANAGE_CHILDCARE 추가
UPDATE `roles`
SET `permissions` = '["MANAGE_ROLE","INVITE_MEMBER","DELETE_GROUP","UPDATE_GROUP","MANAGE_MEMBER","MANAGE_CHILDCARE"]',
    `updatedAt` = NOW()
WHERE `name` = 'OWNER' AND `groupId` IS NULL;

-- ADMIN 역할에 MANAGE_CHILDCARE 추가
UPDATE `roles`
SET `permissions` = '["MANAGE_ROLE","INVITE_MEMBER","MANAGE_MEMBER","MANAGE_CHILDCARE"]',
    `updatedAt` = NOW()
WHERE `name` = 'ADMIN' AND `groupId` IS NULL;
