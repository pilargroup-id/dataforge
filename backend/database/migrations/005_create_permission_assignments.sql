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
  CONSTRAINT fk_permission_assignments_module
    FOREIGN KEY (module_id) REFERENCES permission_modules(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_permission_assignments_submodule
    FOREIGN KEY (submodule_id) REFERENCES permission_submodules(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
