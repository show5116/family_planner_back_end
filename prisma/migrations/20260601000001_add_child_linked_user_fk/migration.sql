-- Child.userId: 자녀 앱 계정 연결용 옵셔널 외래키 추가
-- 유저 탈퇴 시 아이 프로필은 유지하고 userId만 null 처리
ALTER TABLE `children` ADD CONSTRAINT `children_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
