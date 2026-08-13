-- Apply to an existing Dataforge database.
-- Fixes ER_OUT_OF_SORTMEMORY on GET /api/conversions: lets the
-- WHERE created_by = ? ORDER BY created_at DESC LIMIT ? query use an index
-- instead of a filesort.
ALTER TABLE conversion_batches
  ADD KEY idx_conversion_batches_created_by_created_at (created_by, created_at);
