-- GOLD_KRW (환산 국내 금값) 지표를 비활성화
-- 실제 현물가(GOLD_KRW_SPOT)로 대체되었으므로 isActive = false 처리
UPDATE `indicators` SET `isActive` = false WHERE `symbol` = 'GOLD_KRW';
