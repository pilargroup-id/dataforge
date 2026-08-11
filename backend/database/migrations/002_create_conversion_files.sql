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
  CONSTRAINT fk_conversion_files_batch
    FOREIGN KEY (batch_id) REFERENCES conversion_batches(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
