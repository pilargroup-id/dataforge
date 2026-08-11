const PermissionModel = require('../models/permission.model');
const { isITUser, getUserScopeContext } = require('./access.service');

const SCOPE_PRIORITY = {
  COMPANY: 1,
  DEPARTMENT: 2,
  USER: 3,
};

function createHttpError(message, statusCode = 400, code = 'PERMISSION_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function pickEffectiveRule(assignments, requestedSubmoduleId) {
  const eligible = assignments.filter((assignment) => {
    if (requestedSubmoduleId) {
      return assignment.submodule_id === null || Number(assignment.submodule_id) === Number(requestedSubmoduleId);
    }
    return assignment.submodule_id === null;
  });

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const scopeDiff = (SCOPE_PRIORITY[b.scope_type] || 0) - (SCOPE_PRIORITY[a.scope_type] || 0);
    if (scopeDiff !== 0) return scopeDiff;

    const aSpecific = a.submodule_id !== null ? 1 : 0;
    const bSpecific = b.submodule_id !== null ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;

    if (a.effect !== b.effect) return a.effect === 'DENY' ? -1 : 1;
    return Number(b.id) - Number(a.id);
  });

  const top = eligible[0];
  const topScope = SCOPE_PRIORITY[top.scope_type] || 0;
  const topSpecific = top.submodule_id !== null ? 1 : 0;
  const samePriority = eligible.filter(
    (rule) =>
      (SCOPE_PRIORITY[rule.scope_type] || 0) === topScope &&
      (rule.submodule_id !== null ? 1 : 0) === topSpecific
  );

  const deny = samePriority.find((rule) => rule.effect === 'DENY');
  return deny || top;
}

async function hasPermission(user, moduleCode, submoduleCode = null) {
  if (isITUser(user)) {
    return { allowed: true, source: 'IT_FULL_ACCESS', rule: null };
  }

  const moduleRecord = await PermissionModel.findModuleByCode(normalizeCode(moduleCode));
  if (!moduleRecord) return { allowed: false, source: 'MODULE_NOT_FOUND', rule: null };

  let submoduleRecord = null;
  if (submoduleCode) {
    submoduleRecord = await PermissionModel.findSubmoduleByCode(
      moduleRecord.id,
      normalizeCode(submoduleCode)
    );
    if (!submoduleRecord) {
      return { allowed: false, source: 'SUBMODULE_NOT_FOUND', rule: null };
    }
  }

  const scopeContext = getUserScopeContext(user);
  const assignments = await PermissionModel.findAssignmentsForScopeContext({
    ...scopeContext,
    moduleId: moduleRecord.id,
  });

  const rule = pickEffectiveRule(assignments, submoduleRecord?.id || null);
  if (!rule) return { allowed: false, source: 'DEFAULT_DENY', rule: null };

  return {
    allowed: rule.effect === 'ALLOW',
    source: `${rule.scope_type}_${rule.effect}`,
    rule,
  };
}

async function getMyPermissions(user) {
  const rows = await PermissionModel.listModulesWithSubmodules();
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.module_code)) {
      const modulePermission = await hasPermission(user, row.module_code, null);
      grouped.set(row.module_code, {
        code: row.module_code,
        name: row.module_name,
        allowed: modulePermission.allowed,
        submodules: [],
      });
    }

    if (row.submodule_code) {
      const permission = await hasPermission(user, row.module_code, row.submodule_code);
      grouped.get(row.module_code).submodules.push({
        code: row.submodule_code,
        name: row.submodule_name,
        allowed: permission.allowed,
      });
    }
  }

  const modules = Array.from(grouped.values()).map((module) => ({
    ...module,
    allowed: module.allowed || module.submodules.some((submodule) => submodule.allowed),
  }));

  return {
    is_it: isITUser(user),
    modules,
  };
}


async function getCatalog() {
  const rows = await PermissionModel.listModulesWithSubmodules();
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.module_code)) {
      grouped.set(row.module_code, {
        code: row.module_code,
        name: row.module_name,
        description: row.module_description,
        is_active: Boolean(row.module_is_active),
        submodules: [],
      });
    }

    if (row.submodule_code) {
      grouped.get(row.module_code).submodules.push({
        code: row.submodule_code,
        name: row.submodule_name,
        description: row.submodule_description,
        is_active: Boolean(row.submodule_is_active),
      });
    }
  }

  return Array.from(grouped.values());
}

async function resolveModuleAndSubmodule(moduleCode, submoduleCode) {
  const moduleRecord = await PermissionModel.findModuleByCode(normalizeCode(moduleCode));
  if (!moduleRecord) throw createHttpError('Permission module not found', 404, 'PERMISSION_MODULE_NOT_FOUND');

  let submoduleRecord = null;
  if (submoduleCode) {
    submoduleRecord = await PermissionModel.findSubmoduleByCode(moduleRecord.id, normalizeCode(submoduleCode));
    if (!submoduleRecord) throw createHttpError('Permission submodule not found', 404, 'PERMISSION_SUBMODULE_NOT_FOUND');
  }

  return { moduleRecord, submoduleRecord };
}

async function createAssignment(payload, actorUserId) {
  const scopeType = normalizeCode(payload.scope_type);
  const effect = normalizeCode(payload.effect);

  if (!['USER', 'DEPARTMENT', 'COMPANY'].includes(scopeType)) {
    throw createHttpError('scope_type must be USER, DEPARTMENT, or COMPANY');
  }
  if (!payload.scope_id) throw createHttpError('scope_id is required');
  if (!['ALLOW', 'DENY'].includes(effect)) throw createHttpError('effect must be ALLOW or DENY');

  const { moduleRecord, submoduleRecord } = await resolveModuleAndSubmodule(
    payload.module_code,
    payload.submodule_code || null
  );

  const scopeId = String(payload.scope_id);
  const submoduleId = submoduleRecord?.id || null;
  const duplicate = await PermissionModel.findDuplicateAssignment({
    scopeType,
    scopeId,
    moduleId: moduleRecord.id,
    submoduleId,
  });
  if (duplicate) {
    throw createHttpError('Permission assignment already exists for this scope and target', 409, 'PERMISSION_ASSIGNMENT_DUPLICATE');
  }

  return PermissionModel.createAssignment({
    scopeType,
    scopeId,
    moduleId: moduleRecord.id,
    submoduleId,
    effect,
    createdBy: actorUserId,
  });
}

async function updateAssignment(id, payload) {
  const existing = await PermissionModel.findAssignmentById(id);
  if (!existing) throw createHttpError('Permission assignment not found', 404, 'PERMISSION_ASSIGNMENT_NOT_FOUND');

  const scopeType = normalizeCode(payload.scope_type ?? existing.scope_type);
  const effect = normalizeCode(payload.effect ?? existing.effect);
  const scopeId = String(payload.scope_id ?? existing.scope_id);
  const moduleCode = payload.module_code ?? existing.module_code;
  const submoduleCode = Object.prototype.hasOwnProperty.call(payload, 'submodule_code')
    ? payload.submodule_code
    : existing.submodule_code;

  if (!['USER', 'DEPARTMENT', 'COMPANY'].includes(scopeType)) {
    throw createHttpError('scope_type must be USER, DEPARTMENT, or COMPANY');
  }
  if (!['ALLOW', 'DENY'].includes(effect)) throw createHttpError('effect must be ALLOW or DENY');

  const { moduleRecord, submoduleRecord } = await resolveModuleAndSubmodule(moduleCode, submoduleCode || null);

  const submoduleId = submoduleRecord?.id || null;
  const duplicate = await PermissionModel.findDuplicateAssignment({
    scopeType,
    scopeId,
    moduleId: moduleRecord.id,
    submoduleId,
    excludeId: id,
  });
  if (duplicate) {
    throw createHttpError('Permission assignment already exists for this scope and target', 409, 'PERMISSION_ASSIGNMENT_DUPLICATE');
  }

  return PermissionModel.updateAssignment(id, {
    scopeType,
    scopeId,
    moduleId: moduleRecord.id,
    submoduleId,
    effect,
    isActive: payload.is_active === undefined ? existing.is_active : (String(payload.is_active) === '0' || payload.is_active === false ? 0 : 1),
  });
}

module.exports = {
  hasPermission,
  getMyPermissions,
  getCatalog,
  createAssignment,
  updateAssignment,
  listAssignments: PermissionModel.listAssignments,
  deleteAssignment: PermissionModel.deleteAssignment,
};
