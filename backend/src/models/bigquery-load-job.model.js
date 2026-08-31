const { db } = require('../config/database.config');
const { ACTIVE_STATUSES } = require('../constants/bigquery.constant');

function requireDb() {
  if (!db) {
    const err = new Error('Dataforge database is not configured');
    err.statusCode = 500;
    err.code = 'DATABASE_NOT_CONFIGURED';
    throw err;
  }
  return db;
}

async function createJob(data) {
  const pool = requireDb();
  await pool.query(
    `INSERT INTO bigquery_load_jobs
      (id, conversion_batch_id, source_batch_name, source_format, target_format, source_files,
       project_id, dataset_id, table_id, write_disposition, status,
       source_file_count, source_size_bytes, total_records, active_destination_hash,
       created_by, created_by_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      data.id,
      data.conversionBatchId,
      data.sourceBatchName || null,
      data.sourceFormat || null,
      data.targetFormat || 'JSONL',
      data.sourceFiles ? JSON.stringify(data.sourceFiles) : null,
      data.projectId,
      data.datasetId,
      data.tableId,
      data.writeDisposition,
      data.sourceFileCount || 0,
      data.sourceSizeBytes || 0,
      data.totalRecords || 0,
      data.activeDestinationHash,
      data.createdBy,
      data.createdByName || null,
    ]
  );
  return findById(data.id);
}

async function findById(id) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM bigquery_load_jobs WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function list({ userId, isIT, page = 1, limit = 20 }) {
  const pool = requireDb();
  const offset = (page - 1) * limit;
  const where = isIT ? '' : 'WHERE created_by = ?';
  const baseParams = isIT ? [] : [userId];

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM bigquery_load_jobs ${where}`,
    baseParams
  );

  const [rows] = await pool.query(
    `SELECT *
     FROM bigquery_load_jobs
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

async function updateStatus(id, status, extra = {}) {
  const pool = requireDb();
  const fields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];

  const map = {
    total_records: 'total_records',
    validation_summary: 'validation_summary',
    bigquery_job_id: 'bigquery_job_id',
    bigquery_job_location: 'bigquery_job_location',
    error_message: 'error_message',
    error_details: 'error_details',
    started_at: 'started_at',
    completed_at: 'completed_at',
  };

  for (const [key, column] of Object.entries(map)) {
    if (!Object.prototype.hasOwnProperty.call(extra, key)) continue;
    fields.push(`${column} = ?`);
    if (['validation_summary', 'error_details'].includes(key) && extra[key] !== null) {
      params.push(typeof extra[key] === 'string' ? extra[key] : JSON.stringify(extra[key]));
    } else {
      params.push(extra[key]);
    }
  }

  if (['COMPLETED', 'FAILED'].includes(status)) {
    fields.push('active_destination_hash = NULL');
  }

  params.push(id);
  await pool.query(
    `UPDATE bigquery_load_jobs SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  return findById(id);
}

async function setBigQueryJob(id, { jobId, location }) {
  const pool = requireDb();
  await pool.query(
    `UPDATE bigquery_load_jobs
     SET bigquery_job_id = ?, bigquery_job_location = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [jobId || null, location || null, id]
  );
  return findById(id);
}

async function listActive() {
  const pool = requireDb();
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ');
  const [rows] = await pool.query(
    `SELECT * FROM bigquery_load_jobs
     WHERE status IN (${placeholders})
     ORDER BY created_at ASC`,
    ACTIVE_STATUSES
  );
  return rows;
}

module.exports = {
  createJob,
  findById,
  list,
  updateStatus,
  setBigQueryJob,
  listActive,
};
