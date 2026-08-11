INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'XLSX_TO_JSONL', 'XLS/XLSX to JSONL', 'Convert and merge XLS/XLSX folder batches into JSONL', 10, 1
FROM permission_modules
WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'PERMISSION_MANAGE', 'Permission Management', 'Manage Dataforge module and submodule permission assignments', 10, 1
FROM permission_modules
WHERE code = 'ADMINISTRATION'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
