-- Dataforge BigQuery Upload
-- Date: 2026-08-19
-- Apply ONCE to the existing `dataforge` database BEFORE replacing backend files.
-- This migration assumes the existing conversion/permission schema from dataforge-26-08-19.sql.

CREATE TABLE IF NOT EXISTS `bigquery_dataset_access` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `scope_type` enum('USER','DEPARTMENT','COMPANY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataset_id` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resource_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `effect` enum('ALLOW','DENY') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALLOW',
  `can_append` tinyint(1) NOT NULL DEFAULT '0',
  `can_write_empty` tinyint(1) NOT NULL DEFAULT '0',
  `can_truncate` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bigquery_dataset_access_scope_resource` (`scope_type`,`scope_id`,`resource_hash`),
  KEY `idx_bigquery_dataset_access_scope` (`scope_type`,`scope_id`),
  KEY `idx_bigquery_dataset_access_project` (`project_id`),
  KEY `idx_bigquery_dataset_access_dataset` (`dataset_id`(191)),
  KEY `idx_bigquery_dataset_access_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bigquery_load_jobs` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversion_batch_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_batch_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_format` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_format` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'JSONL',
  `source_files` json DEFAULT NULL,
  `project_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataset_id` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_id` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL,
  `write_disposition` enum('WRITE_APPEND','WRITE_EMPTY','WRITE_TRUNCATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('QUEUED','VALIDATING','LOADING','COMPLETED','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'QUEUED',
  `source_file_count` int NOT NULL DEFAULT '0',
  `source_size_bytes` bigint NOT NULL DEFAULT '0',
  `total_records` bigint NOT NULL DEFAULT '0',
  `validation_summary` json DEFAULT NULL,
  `bigquery_job_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bigquery_job_location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `error_details` json DEFAULT NULL,
  `active_destination_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bigquery_load_jobs_active_destination` (`active_destination_hash`),
  KEY `idx_bigquery_load_jobs_created_by` (`created_by`),
  KEY `idx_bigquery_load_jobs_status` (`status`),
  KEY `idx_bigquery_load_jobs_created_at` (`created_at`),
  KEY `idx_bigquery_load_jobs_conversion_batch` (`conversion_batch_id`),
  KEY `idx_bigquery_load_jobs_destination` (`project_id`,`dataset_id`(100),`table_id`(100)),
  CONSTRAINT `fk_bigquery_load_jobs_conversion_batch`
    FOREIGN KEY (`conversion_batch_id`) REFERENCES `conversion_batches` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permission_modules`
  (`code`, `name`, `description`, `sort_order`, `is_active`)
VALUES
  ('BIGQUERY', 'BigQuery', 'Upload JSONL conversion batches into BigQuery', 20, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;

SET @bigquery_module_id = (
  SELECT `id`
  FROM `permission_modules`
  WHERE `code` = 'BIGQUERY'
  LIMIT 1
);

INSERT INTO `permission_submodules`
  (`module_id`, `code`, `name`, `description`, `sort_order`, `is_active`)
VALUES
  (@bigquery_module_id, 'LOAD_DATA', 'Load Data', 'Select completed JSONL conversion batches and load them into authorized BigQuery datasets', 10, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = 1;
