const { WRITE_DISPOSITION } = require('../constants/bigquery.constant');

function createHttpError(message, statusCode = 400, code = 'BIGQUERY_ERROR', errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

function normalizeDatasetId(value) {
  const datasetId = String(value || '').trim();
  if (!datasetId) {
    throw createHttpError('dataset_id is required', 400, 'BIGQUERY_DATASET_REQUIRED');
  }
  if (Buffer.byteLength(datasetId, 'utf8') > 1024 || /[\x00-\x1F\x7F]/.test(datasetId)) {
    throw createHttpError('dataset_id is invalid', 400, 'BIGQUERY_DATASET_INVALID');
  }
  return datasetId;
}

function normalizeTableId(value) {
  const tableId = String(value || '').trim();
  if (!tableId) {
    throw createHttpError('table_id is required', 400, 'BIGQUERY_TABLE_REQUIRED');
  }
  if (Buffer.byteLength(tableId, 'utf8') > 1024 || /[\x00-\x1F\x7F]/.test(tableId)) {
    throw createHttpError('table_id is invalid', 400, 'BIGQUERY_TABLE_INVALID');
  }
  return tableId;
}

function normalizeWriteDisposition(value) {
  const writeDisposition = String(value || '').trim().toUpperCase();
  const allowed = Object.values(WRITE_DISPOSITION);
  if (!allowed.includes(writeDisposition)) {
    throw createHttpError(
      'write_disposition must be WRITE_APPEND, WRITE_EMPTY, or WRITE_TRUNCATE',
      400,
      'BIGQUERY_WRITE_DISPOSITION_INVALID'
    );
  }
  return writeDisposition;
}

function assertTruncateConfirmation(writeDisposition, tableId, confirmation) {
  if (writeDisposition !== WRITE_DISPOSITION.TRUNCATE) return;
  if (String(confirmation || '').trim() !== tableId) {
    throw createHttpError(
      'WRITE_TRUNCATE requires truncate_confirmation matching the destination table name',
      400,
      'BIGQUERY_TRUNCATE_CONFIRMATION_REQUIRED'
    );
  }
}

function normalizeBatchLoadPayload(payload = {}, options = {}) {
  const conversionBatchId = String(payload.conversion_batch_id || '').trim();
  if (!conversionBatchId) {
    throw createHttpError(
      'conversion_batch_id is required',
      400,
      'BIGQUERY_CONVERSION_BATCH_REQUIRED'
    );
  }

  const datasetId = normalizeDatasetId(payload.dataset_id);
  const tableId = normalizeTableId(payload.table_id);
  const writeDisposition = normalizeWriteDisposition(payload.write_disposition);

  if (options.requireTruncateConfirmation !== false) {
    assertTruncateConfirmation(writeDisposition, tableId, payload.truncate_confirmation);
  }

  return {
    conversionBatchId,
    datasetId,
    tableId,
    writeDisposition,
  };
}

function normalizeScopeType(value) {
  const scopeType = String(value || '').trim().toUpperCase();
  if (!['USER', 'DEPARTMENT', 'COMPANY'].includes(scopeType)) {
    throw createHttpError(
      'scope_type must be USER, DEPARTMENT, or COMPANY',
      400,
      'BIGQUERY_SCOPE_TYPE_INVALID'
    );
  }
  return scopeType;
}

function normalizeEffect(value) {
  const effect = String(value || '').trim().toUpperCase();
  if (!['ALLOW', 'DENY'].includes(effect)) {
    throw createHttpError(
      'effect must be ALLOW or DENY',
      400,
      'BIGQUERY_ACCESS_EFFECT_INVALID'
    );
  }
  return effect;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || String(value).toLowerCase() === 'false') {
    return false;
  }
  throw createHttpError(
    'Boolean permission value is invalid',
    400,
    'BIGQUERY_ACCESS_BOOLEAN_INVALID'
  );
}

function normalizeDatasetAccessPayload(payload = {}, existing = null) {
  const scopeType = normalizeScopeType(payload.scope_type ?? existing?.scope_type);
  const scopeId = String(payload.scope_id ?? existing?.scope_id ?? '').trim();
  if (!scopeId) {
    throw createHttpError('scope_id is required', 400, 'BIGQUERY_SCOPE_ID_REQUIRED');
  }

  const datasetId = normalizeDatasetId(payload.dataset_id ?? existing?.dataset_id);
  const effect = normalizeEffect(payload.effect ?? existing?.effect ?? 'ALLOW');

  let canAppend = normalizeBoolean(payload.can_append, Boolean(existing?.can_append));
  let canWriteEmpty = normalizeBoolean(
    payload.can_write_empty,
    Boolean(existing?.can_write_empty)
  );
  let canTruncate = normalizeBoolean(payload.can_truncate, Boolean(existing?.can_truncate));

  if (effect === 'DENY') {
    canAppend = false;
    canWriteEmpty = false;
    canTruncate = false;
  }

  return {
    scopeType,
    scopeId,
    datasetId,
    effect,
    canAppend,
    canWriteEmpty,
    canTruncate,
    isActive: payload.is_active === undefined
      ? (existing ? Boolean(existing.is_active) : true)
      : normalizeBoolean(payload.is_active, true),
  };
}

module.exports = {
  createHttpError,
  normalizeDatasetId,
  normalizeTableId,
  normalizeWriteDisposition,
  normalizeBatchLoadPayload,
  normalizeDatasetAccessPayload,
};
