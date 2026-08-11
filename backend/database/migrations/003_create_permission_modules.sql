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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
