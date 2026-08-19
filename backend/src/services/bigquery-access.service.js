const crypto = require('crypto');
const BigQueryDatasetAccessModel = require('../models/bigquery-dataset-access.model');
const { isITUser, getUserScopeContext } = require('./access.service');
const config = require('../config');
const { WRITE_DISPOSITION } = require('../constants/bigquery.constant');
const {
  createHttpError,
  normalizeDatasetAccessPayload,
} = require('../validators/bigquery.validator');

const SCOPE_PRIORITY = {
  COMPANY: 1,
  DEPARTMENT: 2,
  USER: 3,
};

function requireProjectId() {
  const projectId = String(config.bigquery?.projectId || '').trim();
  if (!projectId) {
    throw createHttpError(
      'BigQuery project is not configured',
      500,
      'BIGQUERY_NOT_CONFIGURED'
    );
  }
  return projectId;
}

function resourceHash(projectId, datasetId) {
  return crypto
    .createHash('sha256')
    .update(`${projectId}:${datasetId}`)
    .digest('hex');
}

function resolveDatasetAccessFromAssignments(assignments, datasetId) {
  const relevant = assignments.filter(
    (row) => String(row.dataset_id) === String(datasetId)
  );

  if (!relevant.length) {
    return {
      allowed: false,
      source: 'DEFAULT_DENY',
      can_append: false,
      can_write_empty: false,
      can_truncate: false,
    };
  }

  const topPriority = Math.max(
    ...relevant.map((row) => SCOPE_PRIORITY[row.scope_type] || 0)
  );
  const top = relevant.filter(
    (row) => (SCOPE_PRIORITY[row.scope_type] || 0) === topPriority
  );

  if (top.some((row) => row.effect === 'DENY')) {
    return {
      allowed: false,
      source: `${top[0]?.scope_type || 'UNKNOWN'}_DENY`,
      can_append: false,
      can_write_empty: false,
      can_truncate: false,
    };
  }

  const allows = top.filter((row) => row.effect === 'ALLOW');
  if (!allows.length) {
    return {
      allowed: false,
      source: 'DEFAULT_DENY',
      can_append: false,
      can_write_empty: false,
      can_truncate: false,
    };
  }

  return {
    allowed: true,
    source: `${allows[0].scope_type}_ALLOW`,
    can_append: allows.some((row) => Boolean(row.can_append)),
    can_write_empty: allows.some((row) => Boolean(row.can_write_empty)),
    can_truncate: allows.some((row) => Boolean(row.can_truncate)),
  };
}

async function getAssignmentsForUser(user) {
  const projectId = requireProjectId();
  const context = getUserScopeContext(user);
  return BigQueryDatasetAccessModel.findAssignmentsForScopeContext({
    ...context,
    projectId,
  });
}

async function getDatasetAccess(user, datasetId, assignments = null) {
  if (isITUser(user)) {
    return {
      allowed: true,
      source: 'IT_FULL_ACCESS',
      can_append: true,
      can_write_empty: true,
      can_truncate: true,
    };
  }

  const rows = assignments || await getAssignmentsForUser(user);
  return resolveDatasetAccessFromAssignments(rows, datasetId);
}

async function assertDatasetAccess(user, datasetId, writeDisposition = null) {
  const access = await getDatasetAccess(user, datasetId);
  if (!access.allowed) {
    throw createHttpError(
      'You do not have access to this BigQuery dataset',
      403,
      'BIGQUERY_DATASET_FORBIDDEN'
    );
  }

  if (!writeDisposition) return access;

  const permissionMap = {
    [WRITE_DISPOSITION.APPEND]: 'can_append',
    [WRITE_DISPOSITION.EMPTY]: 'can_write_empty',
    [WRITE_DISPOSITION.TRUNCATE]: 'can_truncate',
  };
  const flag = permissionMap[writeDisposition];

  if (!flag || !access[flag]) {
    throw createHttpError(
      `You are not allowed to use ${writeDisposition} on this dataset`,
      403,
      'BIGQUERY_WRITE_DISPOSITION_FORBIDDEN'
    );
  }

  return access;
}

async function createAssignment(payload, actorUserId, assertDatasetExists) {
  const projectId = requireProjectId();
  const normalized = normalizeDatasetAccessPayload(payload);
  await assertDatasetExists(normalized.datasetId);

  const hash = resourceHash(projectId, normalized.datasetId);
  const duplicate = await BigQueryDatasetAccessModel.findDuplicate({
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    resourceHash: hash,
  });

  if (duplicate) {
    throw createHttpError(
      'BigQuery dataset access assignment already exists for this scope',
      409,
      'BIGQUERY_DATASET_ACCESS_DUPLICATE'
    );
  }

  return BigQueryDatasetAccessModel.createAssignment({
    ...normalized,
    projectId,
    resourceHash: hash,
    createdBy: actorUserId,
  });
}

async function updateAssignment(id, payload, assertDatasetExists) {
  const projectId = requireProjectId();
  const existing = await BigQueryDatasetAccessModel.findById(id);
  if (!existing) {
    throw createHttpError(
      'BigQuery dataset access assignment not found',
      404,
      'BIGQUERY_DATASET_ACCESS_NOT_FOUND'
    );
  }

  const normalized = normalizeDatasetAccessPayload(payload, existing);
  await assertDatasetExists(normalized.datasetId);

  const hash = resourceHash(projectId, normalized.datasetId);
  const duplicate = await BigQueryDatasetAccessModel.findDuplicate({
    scopeType: normalized.scopeType,
    scopeId: normalized.scopeId,
    resourceHash: hash,
    excludeId: id,
  });

  if (duplicate) {
    throw createHttpError(
      'BigQuery dataset access assignment already exists for this scope',
      409,
      'BIGQUERY_DATASET_ACCESS_DUPLICATE'
    );
  }

  return BigQueryDatasetAccessModel.updateAssignment(id, {
    ...normalized,
    projectId,
    resourceHash: hash,
  });
}

async function listAssignments() {
  return BigQueryDatasetAccessModel.listAssignments(requireProjectId());
}

module.exports = {
  requireProjectId,
  resolveDatasetAccessFromAssignments,
  getAssignmentsForUser,
  getDatasetAccess,
  assertDatasetAccess,
  createAssignment,
  updateAssignment,
  listAssignments,
  deleteAssignment: BigQueryDatasetAccessModel.deleteAssignment,
};
