ALTER TABLE `conversion_batches`
  MODIFY COLUMN `status` enum(
    'UPLOADING',
    'VALIDATING',
    'QUEUED',
    'PROCESSING',
    'PAUSING',
    'PAUSED',
    'COMPLETING',
    'COMPLETED',
    'REJECTED',
    'FAILED',
    'EXPIRED'
  ) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UPLOADING',
  ADD COLUMN `conversion_options` json DEFAULT NULL AFTER `template_code`,
  ADD COLUMN `checkpoint_data` json DEFAULT NULL AFTER `progress_percent`,
  ADD COLUMN `paused_at` datetime DEFAULT NULL AFTER `checkpoint_data`,
  ADD COLUMN `pause_expires_at` datetime DEFAULT NULL AFTER `paused_at`,
  ADD KEY `idx_conversion_batches_pause_expires_at` (`pause_expires_at`);
