-- Dataforge complete schema snapshot
-- Apply this file to a new MySQL database when you prefer one-shot setup.

CREATE TABLE IF NOT EXISTS conversion_batches (
  id varchar(36) NOT NULL,
  batch_name varchar(255) NOT NULL,
  original_folder_name varchar(255) NOT NULL,
  source_format varchar(30) NOT NULL,
  target_format varchar(30) NOT NULL,
  template_code varchar(100) NULL,
  status enum('UPLOADING','VALIDATING','QUEUED','PROCESSING','COMPLETED','REJECTED','FAILED','EXPIRED') NOT NULL DEFAULT 'UPLOADING',
  total_input_files int NOT NULL DEFAULT 0,
  processed_input_files int NOT NULL DEFAULT 0,
  total_output_files int NOT NULL DEFAULT 0,
  total_records bigint NOT NULL DEFAULT 0,
  progress_percent decimal(5,2) NOT NULL DEFAULT 0.00,
  error_message text NULL,
  validation_errors json NULL,
  zip_file_name varchar(255) NULL,
  zip_file_path varchar(1000) NULL,
  zip_size_bytes bigint NULL,
  completed_at datetime NULL,
  expires_at datetime NULL,
  deleted_at datetime NULL,
  created_by varchar(36) NOT NULL,
  created_by_name varchar(255) NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversion_batches_created_by (created_by),
  KEY idx_conversion_batches_status (status),
  KEY idx_conversion_batches_expires_at (expires_at),
  KEY idx_conversion_batches_created_at (created_at),
  KEY idx_conversion_batches_created_by_created_at (created_by, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS conversion_files (
  id bigint NOT NULL AUTO_INCREMENT,
  batch_id varchar(36) NOT NULL,
  file_role enum('INPUT','OUTPUT','ARCHIVE') NOT NULL,
  original_name varchar(255) NULL,
  stored_name varchar(255) NULL,
  relative_path varchar(1000) NULL,
  format varchar(30) NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  record_count bigint NOT NULL DEFAULT 0,
  status varchar(30) NOT NULL DEFAULT 'READY',
  error_message text NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversion_files_batch_id (batch_id),
  KEY idx_conversion_files_role (file_role),
  CONSTRAINT fk_conversion_files_batch FOREIGN KEY (batch_id) REFERENCES conversion_batches(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS permission_modules (
  id bigint NOT NULL AUTO_INCREMENT,
  code varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  description varchar(255) NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permission_module_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS permission_submodules (
  id bigint NOT NULL AUTO_INCREMENT,
  module_id bigint NOT NULL,
  code varchar(100) NOT NULL,
  name varchar(150) NOT NULL,
  description varchar(255) NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permission_submodule_code (module_id, code),
  KEY idx_permission_submodules_module_id (module_id),
  CONSTRAINT fk_permission_submodules_module FOREIGN KEY (module_id) REFERENCES permission_modules(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS permission_assignments (
  id bigint NOT NULL AUTO_INCREMENT,
  scope_type enum('USER','DEPARTMENT','COMPANY') NOT NULL,
  scope_id varchar(100) NOT NULL,
  module_id bigint NOT NULL,
  submodule_id bigint NULL,
  effect enum('ALLOW','DENY') NOT NULL,
  is_active tinyint(1) NOT NULL DEFAULT 1,
  created_by varchar(36) NOT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_permission_assignments_scope (scope_type, scope_id),
  KEY idx_permission_assignments_module (module_id),
  KEY idx_permission_assignments_submodule (submodule_id),
  CONSTRAINT fk_permission_assignments_module FOREIGN KEY (module_id) REFERENCES permission_modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_permission_assignments_submodule FOREIGN KEY (submodule_id) REFERENCES permission_submodules(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO permission_modules (code, name, description, sort_order, is_active)
VALUES
  ('CONVERT', 'Convert', 'File format conversion module', 10, 1),
  ('ADMINISTRATION', 'Administration', 'Dataforge administration module', 90, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'XLSX_TO_JSONL', 'XLS/XLSX to JSONL', 'Convert and merge XLS/XLSX folder batches into JSONL', 10, 1
FROM permission_modules WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'EXCEL_TO_PDF', 'Excel to PDF', 'Convert Excel menjadi PDF menggunakan template yang dipilih', 20, 1
FROM permission_modules WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'EXCEL_TO_XML', 'Excel to XML', 'Convert Excel menjadi XML menggunakan template/preset sistem yang dipilih', 30, 1
FROM permission_modules WHERE code = 'CONVERT'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO permission_submodules (module_id, code, name, description, sort_order, is_active)
SELECT id, 'PERMISSION_MANAGE', 'Permission Management', 'Manage Dataforge module and submodule permission assignments', 10, 1
FROM permission_modules WHERE code = 'ADMINISTRATION'
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), sort_order = VALUES(sort_order), is_active = VALUES(is_active);
