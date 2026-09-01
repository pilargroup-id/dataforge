const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { once } = require('events');
const { BigQuery } = require('@google-cloud/bigquery');
const config = require('../config');
const dataforgeConfig = require('../config/dataforge.config');
const ConversionBatchModel = require('../models/conversion-batch.model');
const ConversionFileModel = require('../models/conversion-file.model');
const BigQueryLoadJobModel = require('../models/bigquery-load-job.model');
const BigQueryAccessService = require('./bigquery-access.service');
const { isITUser } = require('./access.service');
const { removeDir, ensureDir } = require('../utils/file.util');
const {
  LOAD_STATUS,
  WRITE_DISPOSITION,
} = require('../constants/bigquery.constant');
const {
  createHttpError,
  normalizeDatasetId,
  normalizeTableId,
  normalizeBatchLoadPayload,
} = require('../validators/bigquery.validator');

let client = null;

function parseJson(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return value; }
}

function normalizeJob(row) {
  if (!row) return null;
  return {
    ...row,
    source_files: parseJson(row.source_files),
    validation_summary: parseJson(row.validation_summary),
    error_details: parseJson(row.error_details),
  };
}

function getProjectId() {
  return BigQueryAccessService.requireProjectId();
}

function getClient() {
  const projectId = getProjectId();
  if (!client) client = new BigQuery({ projectId });
  return client;
}

function destinationHash(projectId, datasetId, tableId) {
  return crypto
    .createHash('sha256')
    .update(`${projectId}:${datasetId}:${tableId}`)
    .digest('hex');
}

function getJobTempDir(jobId) {
  return path.join(dataforgeConfig.storage.tempRoot, 'bigquery', jobId);
}

function cleanupJobTemp(jobId) {
  removeDir(getJobTempDir(jobId));
}

function safeResolve(root, relativePath) {
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, relativePath || '');
  if (target !== rootResolved && !target.startsWith(`${rootResolved}${path.sep}`)) {
    throw createHttpError(
      'Unsafe source file path detected',
      500,
      'BIGQUERY_SOURCE_PATH_INVALID'
    );
  }
  return target;
}

function mapGoogleError(error, fallbackCode = 'BIGQUERY_UPSTREAM_ERROR') {
  if (error?.statusCode) return error;
  const code = Number(error?.code);
  const message = error?.message || 'BigQuery request failed';

  if (code === 400) return createHttpError(message, 400, 'BIGQUERY_REQUEST_INVALID');
  if (code === 401) return createHttpError(message, 502, 'BIGQUERY_AUTH_FAILED');
  if (code === 403) return createHttpError(message, 403, 'BIGQUERY_GCP_FORBIDDEN');
  if (code === 404) return createHttpError(message, 404, 'BIGQUERY_RESOURCE_NOT_FOUND');
  if (code === 409) return createHttpError(message, 409, 'BIGQUERY_CONFLICT');
  return createHttpError(message, 502, fallbackCode);
}

async function assertDatasetExists(datasetId) {
  try {
    const dataset = getClient().dataset(normalizeDatasetId(datasetId));
    const [metadata] = await dataset.getMetadata();
    return metadata;
  } catch (error) {
    throw mapGoogleError(error, 'BIGQUERY_DATASET_LOOKUP_FAILED');
  }
}

async function getRawTableMetadata(datasetId, tableId) {
  const normalizedDataset = normalizeDatasetId(datasetId);
  const normalizedTable = normalizeTableId(tableId);

  try {
    const table = getClient().dataset(normalizedDataset).table(normalizedTable);
    const [metadata] = await table.getMetadata();
    if (metadata.type && metadata.type !== 'TABLE') {
      throw createHttpError(
        'The selected BigQuery resource is not a writable native table',
        400,
        'BIGQUERY_TABLE_NOT_WRITABLE'
      );
    }
    return metadata;
  } catch (error) {
    if (error?.statusCode) throw error;
    throw mapGoogleError(error, 'BIGQUERY_TABLE_LOOKUP_FAILED');
  }
}

function assertWritePrecondition(metadata, writeDisposition) {
  if (writeDisposition !== WRITE_DISPOSITION.EMPTY) return;
  const numRows = Number(metadata?.numRows || 0);
  if (Number.isFinite(numRows) && numRows > 0) {
    throw createHttpError(
      'WRITE_EMPTY can only be used when the destination table is empty',
      409,
      'BIGQUERY_TABLE_NOT_EMPTY'
    );
  }
}

function tableResponse(metadata) {
  return {
    project_id: metadata.tableReference?.projectId || getProjectId(),
    dataset_id: metadata.tableReference?.datasetId || null,
    table_id: metadata.tableReference?.tableId || null,
    type: metadata.type || null,
    location: metadata.location || null,
    description: metadata.description || null,
    num_rows: metadata.numRows !== undefined ? String(metadata.numRows) : null,
    num_bytes: metadata.numBytes !== undefined ? String(metadata.numBytes) : null,
    schema: metadata.schema || { fields: [] },
    time_partitioning: metadata.timePartitioning || null,
    range_partitioning: metadata.rangePartitioning || null,
    clustering: metadata.clustering || null,
  };
}

async function listDatasets(user) {
  const projectId = getProjectId();
  let datasets;

  try {
    [datasets] = await getClient().getDatasets({ projectId });
  } catch (error) {
    throw mapGoogleError(error, 'BIGQUERY_DATASET_LIST_FAILED');
  }

  const sorted = datasets
    .map((dataset) => ({ id: dataset.id }))
    .filter((dataset) => dataset.id)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (isITUser(user)) {
    return sorted.map((dataset) => ({
      ...dataset,
      project_id: projectId,
      permissions: {
        append: true,
        write_empty: true,
        truncate: true,
      },
    }));
  }

  const assignments = await BigQueryAccessService.getAssignmentsForUser(user);
  const result = [];

  for (const dataset of sorted) {
    const access = BigQueryAccessService.resolveDatasetAccessFromAssignments(
      assignments,
      dataset.id
    );
    if (!access.allowed) continue;

    result.push({
      ...dataset,
      project_id: projectId,
      permissions: {
        append: access.can_append,
        write_empty: access.can_write_empty,
        truncate: access.can_truncate,
      },
    });
  }

  return result;
}

async function listTables(user, datasetId) {
  const normalizedDataset = normalizeDatasetId(datasetId);
  await BigQueryAccessService.assertDatasetAccess(user, normalizedDataset);

  try {
    const [tables] = await getClient().dataset(normalizedDataset).getTables();
    return tables
      .map((table) => ({ id: table.id, dataset_id: normalizedDataset }))
      .filter((table) => table.id)
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    throw mapGoogleError(error, 'BIGQUERY_TABLE_LIST_FAILED');
  }
}

async function getTable(user, datasetId, tableId) {
  const normalizedDataset = normalizeDatasetId(datasetId);
  const normalizedTable = normalizeTableId(tableId);
  const access = await BigQueryAccessService.assertDatasetAccess(user, normalizedDataset);
  const metadata = await getRawTableMetadata(normalizedDataset, normalizedTable);

  return {
    ...tableResponse(metadata),
    permissions: {
      append: access.can_append,
      write_empty: access.can_write_empty,
      truncate: access.can_truncate,
    },
  };
}

function sourceBatchAvailability(row) {
  const status = String(row.status || '').toUpperCase();
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const expiredByTime = expiresAt && expiresAt <= new Date();
  const jsonlCount = Number(row.output_jsonl_file_count || 0);

  if (status === 'EXPIRED' || expiredByTime || row.deleted_at) {
    return { selectable: false, code: 'EXPIRED' };
  }
  if (status !== 'COMPLETED') {
    return { selectable: false, code: status || 'NOT_COMPLETED' };
  }
  if (jsonlCount <= 0) {
    return { selectable: false, code: 'OUTPUT_NOT_AVAILABLE' };
  }
  return { selectable: true, code: 'AVAILABLE' };
}

async function listSourceBatches(user, page, limit) {
  const result = await ConversionBatchModel.listJsonlSourceBatches({
    userId: user.id,
    isIT: isITUser(user),
    page,
    limit,
  });

  return {
    rows: result.rows.map((row) => {
      const availability = sourceBatchAvailability(row);
      return {
        ...row,
        output_jsonl_file_count: Number(row.output_jsonl_file_count || 0),
        output_jsonl_size_bytes: Number(row.output_jsonl_size_bytes || 0),
        selectable: availability.selectable,
        availability: availability.code,
      };
    }),
    total: result.total,
  };
}

function canAccessConversion(user, batch) {
  return isITUser(user) || String(batch.created_by) === String(user?.id);
}

async function resolveConversionSource(conversionBatchId, user = null, enforceOwner = false) {
  const batch = await ConversionBatchModel.findById(conversionBatchId);
  if (!batch) {
    throw createHttpError(
      'Conversion batch not found',
      404,
      'BIGQUERY_CONVERSION_NOT_FOUND'
    );
  }

  if (enforceOwner && !canAccessConversion(user, batch)) {
    throw createHttpError(
      'You cannot use this conversion batch as a BigQuery source',
      403,
      'BIGQUERY_CONVERSION_FORBIDDEN'
    );
  }

  if (String(batch.target_format || '').toUpperCase() !== 'JSONL') {
    throw createHttpError(
      'Only conversion batches with target_format JSONL can be loaded to BigQuery',
      400,
      'BIGQUERY_SOURCE_NOT_JSONL'
    );
  }

  if (batch.status !== 'COMPLETED') {
    throw createHttpError(
      'Conversion batch must be COMPLETED before it can be loaded to BigQuery',
      400,
      'BIGQUERY_CONVERSION_NOT_COMPLETED'
    );
  }

  if (batch.expires_at && new Date(batch.expires_at) <= new Date()) {
    throw createHttpError(
      'Conversion result has expired',
      410,
      'BIGQUERY_CONVERSION_EXPIRED'
    );
  }

  const outputFiles = await ConversionFileModel.listByBatchIdAndRole(batch.id, 'OUTPUT');
  const jsonlFiles = outputFiles.filter(
    (file) => String(file.format || '').toUpperCase() === 'JSONL'
  );

  if (!jsonlFiles.length) {
    throw createHttpError(
      'JSONL output files are not available',
      404,
      'BIGQUERY_SOURCE_FILES_NOT_FOUND'
    );
  }

  const paths = [];
  const manifest = [];

  for (const file of jsonlFiles) {
    const filePath = safeResolve(dataforgeConfig.storage.resultRoot, file.relative_path);
    if (!fs.existsSync(filePath)) {
      throw createHttpError(
        `Conversion output file is no longer available: ${file.stored_name || file.original_name || file.id}`,
        410,
        'BIGQUERY_CONVERSION_FILE_EXPIRED'
      );
    }

    paths.push(filePath);
    manifest.push({
      conversion_file_id: file.id,
      original_name: file.original_name,
      stored_name: file.stored_name,
      relative_path: file.relative_path,
      size_bytes: Number(file.size_bytes || 0),
      record_count: Number(file.record_count || 0),
    });
  }

  return {
    batch,
    paths,
    manifest,
    sourceSizeBytes: manifest.reduce((sum, file) => sum + file.size_bytes, 0),
  };
}

function resolveJobSource(job) {
  const sourceFiles = parseJson(job.source_files);
  if (!Array.isArray(sourceFiles) || !sourceFiles.length) {
    throw createHttpError(
      'BigQuery source file snapshot is missing',
      410,
      'BIGQUERY_SOURCE_SNAPSHOT_MISSING'
    );
  }

  const paths = sourceFiles.map((file) => {
    const filePath = safeResolve(dataforgeConfig.storage.resultRoot, file.relative_path);
    if (!fs.existsSync(filePath)) {
      throw createHttpError(
        `Conversion output file is no longer available: ${file.stored_name || file.original_name || file.conversion_file_id}`,
        410,
        'BIGQUERY_CONVERSION_FILE_EXPIRED'
      );
    }
    return filePath;
  });

  return { paths, manifest: sourceFiles };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumericString(value) {
  return typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Number(value));
}

function validateScalar(value, field, pathName, errors) {
  if (value === null) {
    if (String(field.mode || 'NULLABLE').toUpperCase() === 'REQUIRED') {
      errors.push(`${pathName} is REQUIRED but null`);
    }
    return;
  }

  const type = String(field.type || 'STRING').toUpperCase();
  switch (type) {
    case 'STRING':
      if (typeof value !== 'string') errors.push(`${pathName} must be STRING`);
      break;
    case 'INTEGER':
    case 'INT64':
      if (!(
        (typeof value === 'number' && Number.isInteger(value)) ||
        (typeof value === 'string' && /^[-+]?\d+$/.test(value.trim()))
      )) {
        errors.push(`${pathName} must be INTEGER`);
      }
      break;
    case 'FLOAT':
    case 'FLOAT64':
    case 'NUMERIC':
    case 'BIGNUMERIC':
      if (!(
        (typeof value === 'number' && Number.isFinite(value)) ||
        isNumericString(value)
      )) {
        errors.push(`${pathName} must be numeric`);
      }
      break;
    case 'BOOLEAN':
    case 'BOOL':
      if (typeof value !== 'boolean') errors.push(`${pathName} must be BOOLEAN`);
      break;
    case 'DATE':
    case 'TIME':
    case 'DATETIME':
    case 'TIMESTAMP':
    case 'BYTES':
    case 'GEOGRAPHY':
      if (typeof value !== 'string') errors.push(`${pathName} must be STRING-formatted ${type}`);
      break;
    case 'RECORD':
    case 'STRUCT':
      if (!isPlainObject(value)) {
        errors.push(`${pathName} must be RECORD/OBJECT`);
      } else {
        validateObjectAgainstSchema(value, field.fields || [], pathName, errors);
      }
      break;
    case 'JSON':
    default:
      break;
  }
}

function validateFieldValue(value, field, pathName, errors) {
  const mode = String(field.mode || 'NULLABLE').toUpperCase();
  if (mode === 'REPEATED') {
    if (!Array.isArray(value)) {
      errors.push(`${pathName} must be REPEATED/ARRAY`);
      return;
    }
    const scalarField = { ...field, mode: 'NULLABLE' };
    value.forEach((item, index) => {
      validateScalar(item, scalarField, `${pathName}[${index}]`, errors);
    });
    return;
  }
  validateScalar(value, field, pathName, errors);
}

function validateObjectAgainstSchema(row, fields, prefix, errors) {
  const fieldMap = new Map(fields.map((field) => [field.name, field]));

  for (const key of Object.keys(row)) {
    if (!fieldMap.has(key)) {
      errors.push(`${prefix ? `${prefix}.` : ''}${key} is not present in destination schema`);
    }
  }

  for (const field of fields) {
    const hasValue = Object.prototype.hasOwnProperty.call(row, field.name);
    const pathName = prefix ? `${prefix}.${field.name}` : field.name;
    if (!hasValue) {
      if (String(field.mode || 'NULLABLE').toUpperCase() === 'REQUIRED') {
        errors.push(`${pathName} is REQUIRED but missing`);
      }
      continue;
    }
    validateFieldValue(row[field.name], field, pathName, errors);
  }
}

async function validateJsonlFiles(paths, schemaFields) {
  let totalRecords = 0;
  let invalidRecords = 0;
  const samples = [];
  const maxSamples = 20;

  for (const filePath of paths) {
    const input = fs.createReadStream(filePath, { encoding: 'utf8' });
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    let lineNumber = 0;

    for await (const rawLine of lines) {
      lineNumber += 1;
      const line = rawLine.trim();
      if (!line) continue;
      totalRecords += 1;

      let row;
      try {
        row = JSON.parse(line);
      } catch (_) {
        invalidRecords += 1;
        if (samples.length < maxSamples) {
          samples.push({
            file: path.basename(filePath),
            line: lineNumber,
            errors: ['Invalid JSON'],
          });
        }
        continue;
      }

      const rowErrors = [];
      if (!isPlainObject(row)) {
        rowErrors.push('Each JSONL line must contain one JSON object');
      } else {
        validateObjectAgainstSchema(row, schemaFields, '', rowErrors);
      }

      if (rowErrors.length) {
        invalidRecords += 1;
        if (samples.length < maxSamples) {
          samples.push({
            file: path.basename(filePath),
            line: lineNumber,
            errors: rowErrors.slice(0, 20),
          });
        }
      }
    }
  }

  return {
    valid: invalidRecords === 0,
    total_records: totalRecords,
    invalid_records: invalidRecords,
    error_samples: samples,
  };
}

async function concatenateJsonlFiles(paths, outputPath) {
  ensureDir(path.dirname(outputPath));
  const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });

  try {
    for (const sourcePath of paths) {
      const input = fs.createReadStream(sourcePath, { encoding: 'utf8' });
      const lines = readline.createInterface({ input, crlfDelay: Infinity });
      for await (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (!output.write(`${line}\n`)) await once(output, 'drain');
      }
    }
    output.end();
    await once(output, 'finish');
  } catch (error) {
    output.destroy();
    throw error;
  }
}

async function preflight(user, payload) {
  const normalized = normalizeBatchLoadPayload(payload, {
    requireTruncateConfirmation: false,
  });

  await BigQueryAccessService.assertDatasetAccess(
    user,
    normalized.datasetId,
    normalized.writeDisposition
  );

  const source = await resolveConversionSource(
    normalized.conversionBatchId,
    user,
    true
  );
  const tableMetadata = await getRawTableMetadata(
    normalized.datasetId,
    normalized.tableId
  );
  assertWritePrecondition(tableMetadata, normalized.writeDisposition);

  const validation = await validateJsonlFiles(
    source.paths,
    tableMetadata.schema?.fields || []
  );

  return {
    source: {
      conversion_batch_id: source.batch.id,
      batch_name: source.batch.batch_name,
      source_format: source.batch.source_format,
      target_format: source.batch.target_format,
      jsonl_files: source.manifest.length,
      size_bytes: source.sourceSizeBytes,
      conversion_records: Number(source.batch.total_records || 0),
    },
    destination: tableResponse(tableMetadata),
    write_disposition: normalized.writeDisposition,
    validation,
  };
}

async function createLoadRow(data) {
  try {
    return await BigQueryLoadJobModel.createJob(data);
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
      throw createHttpError(
        'Another BigQuery load is currently running for this destination table',
        409,
        'BIGQUERY_TABLE_LOAD_IN_PROGRESS'
      );
    }
    throw error;
  }
}

async function createLoad(user, payload) {
  const normalized = normalizeBatchLoadPayload(payload);

  await BigQueryAccessService.assertDatasetAccess(
    user,
    normalized.datasetId,
    normalized.writeDisposition
  );

  const tableMetadata = await getRawTableMetadata(
    normalized.datasetId,
    normalized.tableId
  );
  assertWritePrecondition(tableMetadata, normalized.writeDisposition);

  const source = await resolveConversionSource(
    normalized.conversionBatchId,
    user,
    true
  );

  const projectId = getProjectId();
  const id = crypto.randomUUID();

  const job = await createLoadRow({
    id,
    conversionBatchId: source.batch.id,
    sourceBatchName: source.batch.batch_name,
    sourceFormat: source.batch.source_format,
    targetFormat: source.batch.target_format,
    sourceFiles: source.manifest,
    projectId,
    datasetId: normalized.datasetId,
    tableId: normalized.tableId,
    writeDisposition: normalized.writeDisposition,
    sourceFileCount: source.manifest.length,
    sourceSizeBytes: source.sourceSizeBytes,
    totalRecords: Number(source.batch.total_records || 0),
    activeDestinationHash: destinationHash(
      projectId,
      normalized.datasetId,
      normalized.tableId
    ),
    createdBy: user.id,
    createdByName: user.name || user.username || null,
  });

  setImmediate(() => {
    processLoadJob(job.id).catch((error) => {
      console.error('[bigquery] unhandled load error:', error);
    });
  });

  return normalizeJob(job);
}

async function waitForBigQueryJob(jobRef) {
  let consecutiveFailures = 0;

  for (;;) {
    try {
      const [metadata] = await jobRef.getMetadata();
      consecutiveFailures = 0;
      if (metadata.status?.state === 'DONE') return metadata;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= 5) throw error;
      await new Promise((resolve) => {
        setTimeout(resolve, Math.min(10000, 1500 * consecutiveFailures));
      });
    }
  }
}

const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'EPIPE',
  'EAI_AGAIN',
]);

function isTransientNetworkError(error) {
  if (!error) return false;
  if (TRANSIENT_NETWORK_CODES.has(error.code)) return true;
  return /ECONNRESET|socket hang up|network socket disconnected|ETIMEDOUT|EPIPE/i.test(
    String(error.message || '')
  );
}

async function createOrRecoverLoadJob(table, combinedPath, metadata, gcpJobId, location) {
  try {
    const [job] = await table.createLoadJob(combinedPath, metadata);
    return job;
  } catch (createError) {
    try {
      const existingJob = getClient().job(gcpJobId, {
        location: location || undefined,
      });
      await existingJob.getMetadata();
      return existingJob;
    } catch (_) {
      throw createError;
    }
  }
}

async function createOrRecoverLoadJobWithRetry(
  table,
  combinedPath,
  metadata,
  gcpJobId,
  location,
  maxAttempts = 3
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await createOrRecoverLoadJob(table, combinedPath, metadata, gcpJobId, location);
    } catch (error) {
      if (attempt >= maxAttempts || !isTransientNetworkError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  return undefined;
}

function extractJobErrors(metadata) {
  const errors = metadata?.status?.errors || [];
  const errorResult = metadata?.status?.errorResult;
  if (errorResult && !errors.length) return [errorResult];
  return errors;
}

async function completeFromBigQueryMetadata(jobId, metadata) {
  const errors = extractJobErrors(metadata);

  if (errors.length) {
    const message = errors[0]?.message || 'BigQuery load job failed';
    await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.FAILED, {
      error_message: message,
      error_details: errors,
      completed_at: new Date(),
    });
    cleanupJobTemp(jobId);
    return;
  }

  const outputRows = Number(metadata?.statistics?.load?.outputRows);
  await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.COMPLETED, {
    ...(Number.isFinite(outputRows) ? { total_records: outputRows } : {}),
    completed_at: new Date(),
  });
  cleanupJobTemp(jobId);
}

async function processLoadJob(jobId) {
  let job = await BigQueryLoadJobModel.findById(jobId);
  if (!job) return;
  if (![LOAD_STATUS.QUEUED, LOAD_STATUS.VALIDATING].includes(job.status)) return;

  try {
    await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.VALIDATING);
    job = await BigQueryLoadJobModel.findById(jobId);

    const source = resolveJobSource(job);
    const tableMetadata = await getRawTableMetadata(job.dataset_id, job.table_id);
    assertWritePrecondition(tableMetadata, job.write_disposition);

    const validation = await validateJsonlFiles(
      source.paths,
      tableMetadata.schema?.fields || []
    );

    await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.VALIDATING, {
      validation_summary: validation,
      total_records: validation.total_records,
    });

    if (!validation.valid) {
      await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.FAILED, {
        error_message: 'JSONL source does not match the destination BigQuery schema',
        error_details: validation.error_samples,
        completed_at: new Date(),
      });
      cleanupJobTemp(jobId);
      return;
    }

    const loadDir = path.join(getJobTempDir(jobId), 'load');
    const combinedPath = path.join(loadDir, 'combined.jsonl');
    await concatenateJsonlFiles(source.paths, combinedPath);

    await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.LOADING, {
      started_at: new Date(),
    });

    const location = tableMetadata.location || null;
    const table = getClient().dataset(job.dataset_id).table(job.table_id);
    const gcpJobId = `dataforge_${String(jobId).replace(/-/g, '_')}`;

    await BigQueryLoadJobModel.setBigQueryJob(jobId, {
      jobId: gcpJobId,
      location,
    });

    const loadMetadata = {
      jobId: gcpJobId,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      writeDisposition: job.write_disposition,
      createDisposition: 'CREATE_NEVER',
      autodetect: false,
      ignoreUnknownValues: false,
      maxBadRecords: 0,
      schema: tableMetadata.schema,
    };

    const bigQueryJob = await createOrRecoverLoadJobWithRetry(
      table,
      combinedPath,
      loadMetadata,
      gcpJobId,
      location
    );

    const metadata = await waitForBigQueryJob(bigQueryJob);
    await completeFromBigQueryMetadata(jobId, metadata);
  } catch (error) {
    const mapped = error?.statusCode ? error : mapGoogleError(error);
    await BigQueryLoadJobModel.updateStatus(jobId, LOAD_STATUS.FAILED, {
      error_message: mapped.message || 'BigQuery load failed',
      error_details: mapped.errors || error?.errors || null,
      completed_at: new Date(),
    }).catch((updateError) => {
      console.error('[bigquery] failed to persist load failure:', updateError);
    });
    cleanupJobTemp(jobId);
  }
}

async function monitorExistingLoad(row) {
  try {
    const bigQueryJob = getClient().job(row.bigquery_job_id, {
      location: row.bigquery_job_location || undefined,
    });
    const metadata = await waitForBigQueryJob(bigQueryJob);
    await completeFromBigQueryMetadata(row.id, metadata);
  } catch (error) {
    const mapped = error?.statusCode ? error : mapGoogleError(error);
    await BigQueryLoadJobModel.updateStatus(row.id, LOAD_STATUS.FAILED, {
      error_message: `Unable to recover BigQuery load after server restart: ${mapped.message}`,
      completed_at: new Date(),
    }).catch(() => {});
    cleanupJobTemp(row.id);
  }
}

async function recoverActiveLoads() {
  if (!String(config.bigquery?.projectId || '').trim()) return;

  const rows = await BigQueryLoadJobModel.listActive();
  for (const row of rows) {
    if ([LOAD_STATUS.QUEUED, LOAD_STATUS.VALIDATING].includes(row.status)) {
      setImmediate(() => {
        processLoadJob(row.id).catch((error) => {
          console.error('[bigquery] recovery error:', error);
        });
      });
      continue;
    }

    if (row.status === LOAD_STATUS.LOADING && row.bigquery_job_id) {
      setImmediate(() => {
        monitorExistingLoad(row).catch((error) => {
          console.error('[bigquery] monitor recovery error:', error);
        });
      });
      continue;
    }

    await BigQueryLoadJobModel.updateStatus(row.id, LOAD_STATUS.FAILED, {
      error_message: 'BigQuery load was interrupted before a recoverable Google job ID was stored',
      completed_at: new Date(),
    });
    cleanupJobTemp(row.id);
  }
}

async function listLoads(user, page, limit) {
  const result = await BigQueryLoadJobModel.list({
    userId: user.id,
    isIT: isITUser(user),
    page,
    limit,
  });

  return {
    rows: result.rows.map(normalizeJob),
    total: result.total,
  };
}

async function getLoad(user, id) {
  const row = await BigQueryLoadJobModel.findById(id);
  if (!row) {
    throw createHttpError(
      'BigQuery load job not found',
      404,
      'BIGQUERY_LOAD_NOT_FOUND'
    );
  }

  if (!isITUser(user) && String(row.created_by) !== String(user.id)) {
    throw createHttpError(
      'You cannot access this BigQuery load job',
      403,
      'BIGQUERY_LOAD_FORBIDDEN'
    );
  }

  return normalizeJob(row);
}

async function createDatasetAccess(payload, actorUserId) {
  return BigQueryAccessService.createAssignment(
    payload,
    actorUserId,
    assertDatasetExists
  );
}

async function updateDatasetAccess(id, payload) {
  return BigQueryAccessService.updateAssignment(
    id,
    payload,
    assertDatasetExists
  );
}

module.exports = {
  listSourceBatches,
  listDatasets,
  listTables,
  getTable,
  preflight,
  createLoad,
  listLoads,
  getLoad,
  recoverActiveLoads,
  listDatasetAccess: BigQueryAccessService.listAssignments,
  createDatasetAccess,
  updateDatasetAccess,
  deleteDatasetAccess: BigQueryAccessService.deleteAssignment,
};
