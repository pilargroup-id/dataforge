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

async function findAssignmentsForScopeContext({ userId, departmentIds, companyIds, projectId }) {
  const pool = requireDb();
  const clauses = [];
  const params = [projectId];

  if (userId) {
    clauses.push("(scope_type = 'USER' AND scope_id = ?)");
    params.push(userId);
  }

  if (departmentIds.length) {
    clauses.push(`(scope_type = 'DEPARTMENT' AND scope_id IN (${departmentIds.map(() => '?').join(',')}))`);
    params.push(...departmentIds);
  }

  if (companyIds.length) {
    clauses.push(`(scope_type = 'COMPANY' AND scope_id IN (${companyIds.map(() => '?').join(',')}))`);
    params.push(...companyIds);
  }

  if (!clauses.length) return [];

  const [rows] = await pool.query(
    `SELECT *
     FROM bigquery_dataset_access
     WHERE project_id = ?
       AND is_active = 1
       AND (${clauses.join(' OR ')})
     ORDER BY id DESC`,
    params
  );

  return rows;
}

async function listAssignments(projectId) {
  const pool = requireDb();
  const [rows] = await pool.query(
    `SELECT *
     FROM bigquery_dataset_access
     WHERE project_id = ?
     ORDER BY dataset_id ASC, scope_type ASC, scope_id ASC, id DESC`,
    [projectId]
  );
  return rows;
}

async function findById(id) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM bigquery_dataset_access WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findDuplicate({ scopeType, scopeId, resourceHash, excludeId = null }) {
  const pool = requireDb();
  const params = [scopeType, scopeId, resourceHash];
  let sql = `SELECT * FROM bigquery_dataset_access
             WHERE scope_type = ? AND scope_id = ? AND resource_hash = ?`;
  if (excludeId !== null) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function createAssignment(data) {
  const pool = requireDb();
  const [result] = await pool.query(
    `INSERT INTO bigquery_dataset_access
      (scope_type, scope_id, project_id, dataset_id, resource_hash, effect,
       can_append, can_write_empty, can_truncate, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.scopeType,
      data.scopeId,
      data.projectId,
      data.datasetId,
      data.resourceHash,
      data.effect,
      data.canAppend ? 1 : 0,
      data.canWriteEmpty ? 1 : 0,
      data.canTruncate ? 1 : 0,
      data.isActive ? 1 : 0,
      data.createdBy,
    ]
  );
  return findById(result.insertId);
}

async function updateAssignment(id, data) {
  const pool = requireDb();
  await pool.query(
    `UPDATE bigquery_dataset_access
     SET scope_type = ?, scope_id = ?, project_id = ?, dataset_id = ?, resource_hash = ?,
         effect = ?, can_append = ?, can_write_empty = ?, can_truncate = ?, is_active = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.scopeType,
      data.scopeId,
      data.projectId,
      data.datasetId,
      data.resourceHash,
      data.effect,
      data.canAppend ? 1 : 0,
      data.canWriteEmpty ? 1 : 0,
      data.canTruncate ? 1 : 0,
      data.isActive ? 1 : 0,
      id,
    ]
  );
  return findById(id);
}

async function deleteAssignment(id) {
  const pool = requireDb();
  const [result] = await pool.query(
    'DELETE FROM bigquery_dataset_access WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findAssignmentsForScopeContext,
  listAssignments,
  findById,
  findDuplicate,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
