INSERT INTO indicators (id, symbol, name, nameKo, category, unit, isActive, createdAt, updatedAt)
VALUES
  (UUID(), 'RUSSELL2000', 'Russell 2000',  '러셀 2000',  'INDEX',     'pt',    true, NOW(), NOW()),
  (UUID(), 'NAT_GAS',     'Natural Gas',   '천연가스',   'COMMODITY', 'USD/MMBtu', true, NOW(), NOW()),
  (UUID(), 'WHEAT',       'Wheat',         '밀',         'COMMODITY', 'USX/bu', true, NOW(), NOW());
