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
  CONSTRAINT fk_permission_submodules_module
    FOREIGN KEY (module_id) REFERENCES permission_modules(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
