ALTER TABLE conversion_batches
  ADD KEY idx_conversion_batches_created_by_created_at (created_by, created_at);
