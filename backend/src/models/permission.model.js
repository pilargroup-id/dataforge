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

async function listModulesWithSubmodules() {
  const pool = requireDb();
  const [rows] = await pool.query(`
    SELECT
      m.id AS module_id,
      m.code AS module_code,
      m.name AS module_name,
      m.description AS module_description,
      m.is_active AS module_is_active,
      s.id AS submodule_id,
      s.code AS submodule_code,
      s.name AS submodule_name,
      s.description AS submodule_description,
      s.is_active AS submodule_is_active
    FROM permission_modules m
    LEFT JOIN permission_submodules s ON s.module_id = m.id
    ORDER BY m.sort_order, m.code, s.sort_order, s.code
  `);
  return rows;
}

async function findModuleByCode(moduleCode) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM permission_modules WHERE code = ? AND is_active = 1 LIMIT 1',
    [moduleCode]
  );
  return rows[0] || null;
}

async function findSubmoduleByCode(moduleId, submoduleCode) {
  const pool = requireDb();
  const [rows] = await pool.query(
    'SELECT * FROM permission_submodules WHERE module_id = ? AND code = ? AND is_active = 1 LIMIT 1',
    [moduleId, submoduleCode]
  );
  return rows[0] || null;
}

async function findAssignmentsForScopeContext({ userId, departmentIds, companyIds, moduleId }) {
  const pool = requireDb();
  const clauses = [];
  const params = [moduleId];

  if (userId) {
    clauses.push('(scope_type = \'USER\' AND scope_id = ?)');
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
     FROM permission_assignments
     WHERE module_id = ?
       AND is_active = 1
       AND (${clauses.join(' OR ')})`,
    params
  );

  return rows;
}


async function findDuplicateAssignment({ scopeType, scopeId, moduleId, submoduleId, excludeId = null }) {
  const pool = requireDb();
  const params = [scopeType, scopeId, moduleId, submoduleId, submoduleId];
  let sql = `SELECT * FROM permission_assignments
             WHERE scope_type = ? AND scope_id = ? AND module_id = ?
               AND ((submodule_id IS NULL AND ? IS NULL) OR submodule_id = ?)`;
  if (excludeId !== null) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function listAssignments() {
  const pool = requireDb();
  const [rows] = await pool.query(`
    SELECT
      pa.*,
      pm.code AS module_code,
      pm.name AS module_name,
      ps.code AS submodule_code,
      ps.name AS submodule_name
    FROM permission_assignments pa
    INNER JOIN permission_modules pm ON pm.id = pa.module_id
    LEFT JOIN permission_submodules ps ON ps.id = pa.submodule_id
    ORDER BY pa.created_at DESC, pa.id DESC
  `);
  return rows;
}

async function createAssignment(data) {
  const pool = requireDb();
  const [result] = await pool.query(
    `INSERT INTO permission_assignments
      (scope_type, scope_id, module_id, submodule_id, effect, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [
      data.scopeType,
      data.scopeId,
      data.moduleId,
      data.submoduleId,
      data.effect,
      data.createdBy,
    ]
  );

  return findAssignmentById(result.insertId);
}

async function findAssignmentById(id) {
  const pool = requireDb();
  const [rows] = await pool.query(`
    SELECT
      pa.*,
      pm.code AS module_code,
      pm.name AS module_name,
      ps.code AS submodule_code,
      ps.name AS submodule_name
    FROM permission_assignments pa
    INNER JOIN permission_modules pm ON pm.id = pa.module_id
    LEFT JOIN permission_submodules ps ON ps.id = pa.submodule_id
    WHERE pa.id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function updateAssignment(id, data) {
  const pool = requireDb();
  await pool.query(
    `UPDATE permission_assignments
     SET scope_type = ?, scope_id = ?, module_id = ?, submodule_id = ?, effect = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.scopeType,
      data.scopeId,
      data.moduleId,
      data.submoduleId,
      data.effect,
      data.isActive,
      id,
    ]
  );
  return findAssignmentById(id);
}

async function deleteAssignment(id) {
  const pool = requireDb();
  const [result] = await pool.query('DELETE FROM permission_assignments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listModulesWithSubmodules,
  findModuleByCode,
  findSubmoduleByCode,
  findAssignmentsForScopeContext,
  findDuplicateAssignment,
  listAssignments,
  createAssignment,
  findAssignmentById,
  updateAssignment,
  deleteAssignment,
};
