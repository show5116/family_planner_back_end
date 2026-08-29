-- 일일 목표 기본 포함 범위 전환 (4차)
-- 2차 마이그레이션에서 WEEKLY/MONTHLY 습관을 includeInDailyGoal=false로 전환했으나,
-- 목표 모드 기본값(ALL)과 겹쳐 습관 대부분이 목표 집계에서 빠지는 문제가 발생했다.
-- 목표 개수를 60%로 낮추는 프론트 변경과 함께, 신규 생성 기본값과 기존 데이터를 모두 true로 되돌린다.
-- 출시 전(실사용자 데이터 없음)이라 사용자가 개별적으로 끈 습관과 자동으로 꺼진 습관을 구분하지 않고 전부 true로 되돌린다.
UPDATE `routines` SET `includeInDailyGoal` = true WHERE `includeInDailyGoal` = false;
