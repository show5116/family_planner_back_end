-- ShoppingHistoryItem에 품목별 금액 필드 추가
ALTER TABLE `shopping_history_items` ADD COLUMN `price` DECIMAL(10,2) NULL;
