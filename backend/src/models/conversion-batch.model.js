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

async function createBatch(data) {
  const pool = requireDb();
  await pool.query(
    `INSERT INTO conversion_batches
      (id, batch_name, original_folder_name, source_format, target_format, status,
       total_input_files, processed_input_files, total_output_files, total_records,
       progress_percent, created_by, created_by_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      data.id,
      data.batchName,
      data.originalFolderName,
      data.sourceFormat,
      data.targetFormat,
      data.status,
      data.totalInputFiles,
      data.createdBy,
      data.createdByName,
    ]
  );
  return findById(data.id);
}

async function findById(id) {
  const pool = requireDb();
  const [rows] = await pool.query('SELECT * FROM conversion_batches WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function updateStatus(id, status, extra = {}) {
  const pool = requireDb();
  const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];

  const map = {
    processed_input_files: 'processed_input_files',
    total_output_files: 'total_output_files',
    total_records: 'total_records',
    progress_percent: 'progress_percent',
    error_message: 'error_message',
    validation_errors: 'validation_errors',
    zip_file_name: 'zip_file_name',
    zip_file_path: 'zip_file_path',
    zip_size_bytes: 'zip_size_bytes',
    completed_at: 'completed_at',
    expires_at: 'expires_at',
    deleted_at: 'deleted_at',
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      fields.push(`${column} = ?`);
      params.push(key === 'validation_errors' && extra[key] !== null ? JSON.stringify(extra[key]) : extra[key]);
    }
  }

  params.push(id);
  await pool.query(`UPDATE conversion_batches SET ${fields.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function updateProgress(id, processedInputFiles, progressPercent) {
  const pool = requireDb();
  await pool.query(
    `UPDATE conversion_batches
     SET processed_input_files = ?, progress_percent = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [processedInputFiles, progressPercent, id]
  );
}

async function list({ userId, isIT, page = 1, limit = 20 }) {
  const pool = requireDb();
  const offset = (page - 1) * limit;
  const where = isIT ? '' : 'WHERE created_by = ?';
  const baseParams = isIT ? [] : [userId];

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM conversion_batches ${where}`,
    baseParams
  );

  const [rows] = await pool.query(
    `SELECT * FROM conversion_batches
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...baseParams, limit, offset]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
  };
}

async function listExpired(now) {
  const pool = requireDb();
  const [rows] = await pool.query(
    `SELECT * FROM conversion_batches
     WHERE status = 'COMPLETED'
       AND expires_at IS NOT NULL
       AND expires_at <= ?`,
    [now]
  );
  return rows;
}

module.exports = {
  createBatch,
  findById,
  updateStatus,
  updateProgress,
  list,
  listExpired,
};
