const fs = require('fs');
const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const ConversionFileModel = require('../models/conversion-file.model');
const ConverterRegistry = require('../converters/converter.registry');
const ConversionService = require('../services/conversion.service');
const CleanupService = require('../services/cleanup.service');
const { isITUser } = require('../services/access.service');
const dataforgeConfig = require('../config/dataforge.config');
const STATUS = require('../constants/conversion-status.constant');
const R = require('../utils/response.util');
const { sanitizeFileName } = require('../utils/file.util');
const { secondsUntil } = require('../utils/date.util');

function normalizeBatch(row) {
  if (!row) return null;
  let validationErrors = row.validation_errors;
  if (typeof validationErrors === 'string') {
    try { validationErrors = JSON.parse(validationErrors); } catch (_) { /* keep raw */ }
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  const downloadAvailable = row.status === STATUS.COMPLETED && row.zip_file_path && fs.existsSync(row.zip_file_path);

  return {
    ...row,
    validation_errors: validationErrors,
    download_available: Boolean(downloadAvailable),
    expires_in_seconds: expiresAt && downloadAvailable ? secondsUntil(expiresAt) : 0,
  };
}

async function create(req, res, next) {
  try {
    const folderName = String(req.body.folder_name || '').trim();
    if (!folderName) {
      CleanupService.removeBatchTemp(req.batchUploadId);
      return R.badRequest(res, 'folder_name is required', { code: 'FOLDER_NAME_REQUIRED' });
    }

    const batchName = sanitizeFileName(folderName, 'dataforge_batch');
    const files = req.files || [];
    const batch = await ConversionBatchModel.createBatch({
      id: req.batchUploadId,
      batchName,
      originalFolderName: folderName,
      sourceFormat: req.sourceFormat,
      targetFormat: req.targetFormat,
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
      }).catch((error) => {
        console.error('[conversion] unhandled background error:', error);
      });
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
    const result = await ConversionBatchModel.list({
      userId: req.user.id,
      isIT: isITUser(req.user),
      page,
      limit,
    });

    return R.paginated(
      res,
      result.rows.map(normalizeBatch),
      {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
      'Conversion batches loaded'
    );
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const batch = await ConversionBatchModel.findById(req.params.id);
    if (!batch) return R.notFound(res, 'Conversion batch not found');

    if (!isITUser(req.user) && String(batch.created_by) !== String(req.user.id)) {
      return R.forbidden(res, 'You cannot access this conversion batch', { code: 'BATCH_FORBIDDEN' });
    }

    const files = await ConversionFileModel.listByBatchId(batch.id);
    return R.ok(res, { ...normalizeBatch(batch), files }, 'Conversion batch loaded');
  } catch (err) {
    return next(err);
  }
}

async function download(req, res, next) {
  try {
    const batch = await ConversionBatchModel.findById(req.params.id);
    if (!batch) return R.notFound(res, 'Conversion batch not found');

    if (!isITUser(req.user) && String(batch.created_by) !== String(req.user.id)) {
      return R.forbidden(res, 'You cannot download this conversion batch', { code: 'BATCH_FORBIDDEN' });
    }

    if (batch.status !== STATUS.COMPLETED || !batch.zip_file_path || !fs.existsSync(batch.zip_file_path)) {
      return R.notFound(res, 'Conversion result is no longer available');
    }

    if (batch.expires_at && new Date(batch.expires_at) <= new Date()) {
      return R.notFound(res, 'Conversion result has expired and is waiting for cleanup');
    }

    return res.download(batch.zip_file_path, batch.zip_file_name || path.basename(batch.zip_file_path));
  } catch (err) {
    return next(err);
  }
}

async function capabilities(req, res, next) {
  try {
    const PermissionService = require('../services/permission.service');
    const capabilities = [];

    for (const item of ConverterRegistry.listCapabilities()) {
      const source = item.source_formats.includes('XLSX') ? 'XLSX' : item.source_formats[0];
      const submodule = `${source}_TO_${item.target_format}`;
      const permission = await PermissionService.hasPermission(req.user, 'CONVERT', submodule);
      capabilities.push({ ...item, allowed: permission.allowed });
    }

    return R.ok(res, { supported_conversions: capabilities }, 'Conversion capabilities loaded');
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, show, download, capabilities };
