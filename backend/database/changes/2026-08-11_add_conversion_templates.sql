-- Apply to an existing Dataforge database.
ALTER TABLE conversion_batches
  ADD COLUMN template_code varchar(100) NULL AFTER target_format;

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'EXCEL_TO_PDF', 'Excel to PDF', 'Convert Excel menjadi PDF menggunakan template yang dipilih', 20, 1
FROM permission_modules WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'EXCEL_TO_XML', 'Excel to XML', 'Convert Excel menjadi XML menggunakan template/preset sistem yang dipilih', 30, 1
FROM permission_modules WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
