const { db } = require('../config/database.config');

function requireDb() {
  if (!db) {
    const err = new Error('Dataforge database is not configured');
    err.statusCode = 500;
    err.code = 'DATABASE_NOT_CONFIGURED';
    throw err;
  }
  return db;
}

async function insertMany(batchId, files) {
  if (!files.length) return;
  const pool = requireDb();
  const values = files.map((file) => [
    batchId,
    file.file_role,
    file.original_name || null,
    file.stored_name || null,
    file.relative_path || null,
    file.format || null,
    file.size_bytes || 0,
    file.record_count || 0,
    file.status || 'READY',
    file.error_message || null,
  ]);

  await pool.query(
    `INSERT INTO conversion_files
      (batch_id, file_role, original_name, stored_name, relative_path, format,
       size_bytes, record_count, status, error_message)
     VALUES ?`,
    [values]
  );
}

async function listByBatchId(batchId) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM conversion_files WHERE batch_id = ? ORDER BY id ASC',
    [batchId]
  );
  return rows;
}

async function findByIdAndBatchId(id, batchId) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM conversion_files WHERE id = ? AND batch_id = ? LIMIT 1',
    [id, batchId]
  );
  return rows[0] || null;
}

module.exports = { insertMany, listByBatchId, findByIdAndBatchId };
