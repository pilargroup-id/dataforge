INSERT INTO permission_modules (code, name, description, sort_order, is_active)
VALUES
  ('CONVERT', 'Convert', 'File format conversion module', 10, 1),
  ('ADMINISTRATION', 'Administration', 'Dataforge administration module', 90, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
