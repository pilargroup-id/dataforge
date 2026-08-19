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
      (id, batch_name, original_folder_name, source_format, target_format, template_code,
       conversion_options, checkpoint_data, status,
       total_input_files, processed_input_files, total_output_files, total_records,
       progress_percent, created_by, created_by_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0, 0, 0, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      data.id,
      data.batchName,
      data.originalFolderName,
      data.sourceFormat,
      data.targetFormat,
      data.templateCode,
      data.options && Object.keys(data.options).length ? JSON.stringify(data.options) : null,
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
    checkpoint_data: 'checkpoint_data',
    paused_at: 'paused_at',
    pause_expires_at: 'pause_expires_at',
    conversion_options: 'conversion_options',
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      fields.push(`${column} = ?`);
      if (['validation_errors', 'checkpoint_data', 'conversion_options'].includes(key) && extra[key] !== null) {
        params.push(typeof extra[key] === 'string' ? extra[key] : JSON.stringify(extra[key]));
      } else {
        params.push(extra[key]);
      }
    }
  }

  params.push(id);
  await pool.query(`UPDATE conversion_batches SET ${fields.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function transitionStatus(id, fromStatuses, toStatus, extra = {}) {
  const pool = requireDb();
  const allowed = Array.isArray(fromStatuses) ? fromStatuses : [fromStatuses];
  if (!allowed.length) return false;

  const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [toStatus];
  const map = {
    error_message: 'error_message',
    validation_errors: 'validation_errors',
    checkpoint_data: 'checkpoint_data',
    paused_at: 'paused_at',
    pause_expires_at: 'pause_expires_at',
    completed_at: 'completed_at',
    expires_at: 'expires_at',
    deleted_at: 'deleted_at',
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      fields.push(`${column} = ?`);
      if (['validation_errors', 'checkpoint_data'].includes(key) && extra[key] !== null) {
        params.push(typeof extra[key] === 'string' ? extra[key] : JSON.stringify(extra[key]));
      } else {
        params.push(extra[key]);
      }
    }
  }

  const placeholders = allowed.map(() => '?').join(', ');
  params.push(id, ...allowed);
  const [result] = await pool.query(
    `UPDATE conversion_batches
     SET ${fields.join(', ')}
     WHERE id = ? AND status IN (${placeholders})`,
    params
  );
  return result.affectedRows > 0;
}

async function updateProgress(id, { processedInputFiles, progressPercent, totalRecords, checkpointData }) {
  const pool = requireDb();
  const fields = ['updated_at = CURRENT_TIMESTAMP'];
  const params = [];

  if (processedInputFiles !== undefined) {
    fields.push('processed_input_files = ?');
    params.push(processedInputFiles);
  }
  if (progressPercent !== undefined) {
    fields.push('progress_percent = ?');
    params.push(progressPercent);
  }
  if (totalRecords !== undefined) {
    fields.push('total_records = ?');
    params.push(totalRecords);
  }
  if (checkpointData !== undefined) {
    fields.push('checkpoint_data = ?');
    params.push(checkpointData === null ? null : JSON.stringify(checkpointData));
  }

  params.push(id);
  const [result] = await pool.query(
    `UPDATE conversion_batches SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return result.affectedRows > 0;
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
    `SELECT id, batch_name, original_folder_name, source_format, target_format, template_code,
            status, total_input_files, processed_input_files, total_output_files, total_records,
            progress_percent, checkpoint_data, paused_at, pause_expires_at,
            zip_file_name, zip_file_path, zip_size_bytes,
            completed_at, expires_at, deleted_at, created_by, created_by_name, created_at, updated_at
     FROM conversion_batches
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


async function listJsonlSourceBatches({ userId, isIT, page = 1, limit = 20 }) {
  const pool = requireDb();
  const offset = (page - 1) * limit;
  const ownerClause = isIT ? '' : 'AND cb.created_by = ?';
  const baseParams = isIT ? [] : [userId];

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM conversion_batches cb
     WHERE UPPER(cb.target_format) = 'JSONL'
     ${ownerClause}`,
    baseParams
  );

  const [rows] = await pool.query(
    `SELECT
       cb.id,
       cb.batch_name,
       cb.original_folder_name,
       cb.source_format,
       cb.target_format,
       cb.status,
       cb.total_input_files,
       cb.total_output_files,
       cb.total_records,
       cb.progress_percent,
       cb.completed_at,
       cb.expires_at,
       cb.deleted_at,
       cb.created_by,
       cb.created_by_name,
       cb.created_at,
       cb.updated_at,
       (
         SELECT COUNT(*)
         FROM conversion_files cf
         WHERE cf.batch_id = cb.id
           AND cf.file_role = 'OUTPUT'
           AND UPPER(COALESCE(cf.format, '')) = 'JSONL'
       ) AS output_jsonl_file_count,
       (
         SELECT COALESCE(SUM(cf.size_bytes), 0)
         FROM conversion_files cf
         WHERE cf.batch_id = cb.id
           AND cf.file_role = 'OUTPUT'
           AND UPPER(COALESCE(cf.format, '')) = 'JSONL'
       ) AS output_jsonl_size_bytes
     FROM conversion_batches cb
     WHERE UPPER(cb.target_format) = 'JSONL'
     ${ownerClause}
     ORDER BY cb.created_at DESC
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
    `SELECT cb.*
     FROM conversion_batches cb
     WHERE cb.status = 'COMPLETED'
       AND cb.expires_at IS NOT NULL
       AND cb.expires_at <= ?
       AND NOT EXISTS (
         SELECT 1
         FROM bigquery_load_jobs bq
         WHERE bq.conversion_batch_id = cb.id
           AND bq.status IN ('QUEUED', 'VALIDATING', 'LOADING')
       )`,
    [now]
  );
  return rows;
}

async function listExpiredPaused(now) {
  const pool = requireDb();
  const [rows] = await pool.query(
    `SELECT * FROM conversion_batches
     WHERE status = 'PAUSED'
       AND pause_expires_at IS NOT NULL
       AND pause_expires_at <= ?`,
    [now]
  );
  return rows;
}

async function deleteById(id) {
  const pool = requireDb();
  const [result] = await pool.query('DELETE FROM conversion_batches WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createBatch,
  findById,
  updateStatus,
  transitionStatus,
  updateProgress,
  list,
  listJsonlSourceBatches,
  listExpired,
  listExpiredPaused,
  deleteById,
};
