const fs = require('fs');
const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const ConversionFileModel = require('../models/conversion-file.model');
const ConverterRegistry = require('../converters/converter.registry');
const ConversionService = require('../services/conversion.service');
const CleanupService = require('../services/cleanup.service');
const PermissionService = require('../services/permission.service');
const { isITUser } = require('../services/access.service');
const dataforgeConfig = require('../config/dataforge.config');
const STATUS = require('../constants/conversion-status.constant');
const R = require('../utils/response.util');
const { sanitizeFileName, sanitizeReadableFileName } = require('../utils/file.util');
const { secondsUntil } = require('../utils/date.util');

function parseJson(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return value; }
}

function normalizeBatch(row) {
  if (!row) return null;

  const validationErrors = parseJson(row.validation_errors);
  const checkpointData = parseJson(row.checkpoint_data);
  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const pauseExpiresAt = row.pause_expires_at ? new Date(row.pause_expires_at) : null;
  const downloadAvailable = row.status === STATUS.COMPLETED && row.zip_file_path && fs.existsSync(row.zip_file_path);

  return {
    ...row,
    validation_errors: validationErrors,
    checkpoint_data: checkpointData,
    download_available: Boolean(downloadAvailable),
    expires_in_seconds: expiresAt && downloadAvailable ? secondsUntil(expiresAt) : 0,
    pause_expires_in_seconds:
      row.status === STATUS.PAUSED && pauseExpiresAt ? secondsUntil(pauseExpiresAt) : 0,
  };
}

function deriveBatchName(folderName, files) {
  if (folderName) return sanitizeFileName(folderName, 'dataforge_batch');
  if (files.length === 1) {
    const base = path.basename(files[0].originalname, path.extname(files[0].originalname));
    return sanitizeReadableFileName(base, 'dataforge_batch');
  }
  return 'dataforge_batch';
}

function canAccessBatch(req, batch) {
  return isITUser(req.user) || String(batch.created_by) === String(req.user.id);
}

async function loadOwnedBatch(req, res) {
  const batch = await ConversionBatchModel.findById(req.params.id);
  if (!batch) {
    R.notFound(res, 'Conversion batch not found');
    return null;
  }
  if (!canAccessBatch(req, batch)) {
    R.forbidden(res, 'You cannot access this conversion batch', { code: 'BATCH_FORBIDDEN' });
    return null;
  }
  return batch;
}

async function create(req, res, next) {
  try {
    const files = req.files || [];
    if (req.converter.inputMode === 'single' && files.length !== 1) {
      CleanupService.removeBatchTemp(req.batchUploadId);
      return R.badRequest(res, 'Converter ini hanya menerima 1 file per batch', { code: 'SINGLE_FILE_REQUIRED' });
    }

    const folderName = String(req.body.folder_name || '').trim();
    if (!folderName && req.converter.inputMode === 'batch') {
      CleanupService.removeBatchTemp(req.batchUploadId);
      return R.badRequest(res, 'folder_name is required for batch conversion', { code: 'FOLDER_NAME_REQUIRED' });
    }

    const batchName = deriveBatchName(folderName, files);
    const templateCode = String(req.body.template_code || req.converter.defaultTemplateCode || '').trim() || null;
    const options = {};
    if (req.body.branch_code !== undefined) options.branch_code = String(req.body.branch_code).trim();

    const batch = await ConversionBatchModel.createBatch({
      id: req.batchUploadId,
      batchName,
      originalFolderName: folderName || batchName,
      sourceFormat: req.sourceFormat,
      targetFormat: req.targetFormat,
      templateCode,
      options,
      status: STATUS.QUEUED,
      totalInputFiles: files.length,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.username || null,
    });

    await ConversionFileModel.insertMany(batch.id, files.map((file) => ({
      file_role: 'INPUT',
      original_name: file.originalname,
      stored_name: path.basename(file.path),
      relative_path: path.relative(dataforgeConfig.storage.tempRoot, file.path),
      format: path.extname(file.originalname).slice(1).toUpperCase(),
      size_bytes: file.size,
      record_count: 0,
      status: 'UPLOADED',
    })));

    setImmediate(() => {
      ConversionService.processBatch({
        batchId: batch.id,
        batchName,
        converter: req.converter,
        files,
        sourceFormat: req.sourceFormat,
        targetFormat: req.targetFormat,
        templateCode,
        options,
      }).catch((error) => console.error('[conversion] unhandled background error:', error));
    });

    return R.created(res, normalizeBatch(batch), 'Conversion batch created');
  } catch (err) {
    CleanupService.removeBatchTemp(req.batchUploadId);
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await ConversionBatchModel.list({ userId: req.user.id, isIT: isITUser(req.user), page, limit });
    return R.paginated(res, result.rows.map(normalizeBatch), {
      page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) || 1,
    }, 'Conversion batches loaded');
  } catch (err) { return next(err); }
}

async function show(req, res, next) {
  try {
    const batch = await loadOwnedBatch(req, res);
    if (!batch) return;
    const files = await ConversionFileModel.listByBatchId(batch.id);
    return R.ok(res, { ...normalizeBatch(batch), files }, 'Conversion batch loaded');
  } catch (err) { return next(err); }
}

async function pause(req, res, next) {
  try {
    const batch = await loadOwnedBatch(req, res);
    if (!batch) return;

    const updated = await ConversionService.requestPause(batch.id);
    return R.ok(res, normalizeBatch(updated), 'Pause requested. Batch will stop at the next safe checkpoint.');
  } catch (err) { return next(err); }
}

async function continueBatch(req, res, next) {
  try {
    const batch = await loadOwnedBatch(req, res);
    if (!batch) return;

    const updated = await ConversionService.continueBatch(batch.id);
    return R.ok(res, normalizeBatch(updated), 'Conversion queued to continue from the last checkpoint.');
  } catch (err) { return next(err); }
}

async function cancel(req, res, next) {
  try {
    const batch = await loadOwnedBatch(req, res);
    if (!batch) return;

    await ConversionService.cancelBatch(batch.id);
    return R.ok(res, {
      id: batch.id,
      deleted: true,
    }, 'Conversion cancelled and batch data deleted.');
  } catch (err) { return next(err); }
}

async function download(req, res, next) {
  try {
    const batch = await ConversionBatchModel.findById(req.params.id);
    if (!batch) return R.notFound(res, 'Conversion batch not found');
    if (!canAccessBatch(req, batch)) {
      return R.forbidden(res, 'You cannot download this conversion batch', { code: 'BATCH_FORBIDDEN' });
    }
    if (batch.status !== STATUS.COMPLETED || !batch.zip_file_path || !fs.existsSync(batch.zip_file_path)) {
      return R.notFound(res, 'Conversion result is no longer available');
    }
    if (batch.expires_at && new Date(batch.expires_at) <= new Date()) {
      return R.notFound(res, 'Conversion result has expired and is waiting for cleanup');
    }
    return res.download(batch.zip_file_path, batch.zip_file_name || path.basename(batch.zip_file_path));
  } catch (err) { return next(err); }
}

async function fileContent(req, res, next) {
  try {
    const batch = await ConversionBatchModel.findById(req.params.id);
    if (!batch) return R.notFound(res, 'Conversion batch not found');
    if (!canAccessBatch(req, batch)) {
      return R.forbidden(res, 'You cannot access this conversion batch', { code: 'BATCH_FORBIDDEN' });
    }

    const file = await ConversionFileModel.findByIdAndBatchId(req.params.fileId, batch.id);
    if (!file || file.file_role !== 'OUTPUT') {
      return R.notFound(res, 'Output file not found');
    }

    const filePath = path.join(dataforgeConfig.storage.resultRoot, file.relative_path);
    if (!filePath.startsWith(dataforgeConfig.storage.resultRoot) || !fs.existsSync(filePath)) {
      return R.notFound(res, 'Output file is no longer available');
    }

    return res.sendFile(path.resolve(filePath));
  } catch (err) { return next(err); }
}

async function capabilities(req, res, next) {
  try {
    const capabilities = [];
    for (const item of ConverterRegistry.listCapabilities()) {
      const permission = await PermissionService.hasPermission(req.user, 'CONVERT', item.permission_code);
      capabilities.push({ ...item, allowed: permission.allowed });
    }
    return R.ok(res, { supported_conversions: capabilities }, 'Conversion capabilities loaded');
  } catch (err) { return next(err); }
}

module.exports = {
  create,
  list,
  show,
  pause,
  continueBatch,
  cancel,
  download,
  fileContent,
  capabilities,
};
