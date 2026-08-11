ALTER TABLE conversion_batches
  ADD COLUMN template_code varchar(100) NULL AFTER target_format;
