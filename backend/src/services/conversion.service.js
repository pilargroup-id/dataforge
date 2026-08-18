const fs = require('fs');
const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const ConversionFileModel = require('../models/conversion-file.model');
const ConverterRegistry = require('../converters/converter.registry');
const ArchiveService = require('./archive.service');
const CleanupService = require('./cleanup.service');
const dataforgeConfig = require('../config/dataforge.config');
const STATUS = require('../constants/conversion-status.constant');
const { calculateExpiry, addHours } = require('../utils/date.util');
const { ensureDir, sanitizeReadableFileName, removeDir } = require('../utils/file.util');

function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function controlError(code, message) {
  const err = new Error(message);
  err.code = code;
  err.isConversionControl = true;
  return err;
}

async function assertRunnable(batchId) {
  const batch = await ConversionBatchModel.findById(batchId);
  if (!batch) {
    throw controlError('CONVERSION_CANCELLED', 'Conversion batch was cancelled');
  }
  if (batch.status === STATUS.PAUSING || batch.status === STATUS.PAUSED) {
    throw controlError('CONVERSION_PAUSED', 'Conversion pause requested');
  }
  return batch;
}

async function transitionOrControl(batchId, fromStatuses, toStatus, extra = {}) {
  const changed = await ConversionBatchModel.transitionStatus(batchId, fromStatuses, toStatus, extra);
  if (changed) return;

  const batch = await assertRunnable(batchId);
  if (batch.status === toStatus) return;

  const err = new Error(`Invalid conversion state transition: ${batch.status} -> ${toStatus}`);
  err.code = 'INVALID_CONVERSION_STATE';
  throw err;
}

function outputRow(batchId, file, targetFormat) {
  return {
    file_role: 'OUTPUT',
    original_name: null,
    stored_name: file.file_name,
    relative_path: path.relative(dataforgeConfig.storage.resultRoot, file.file_path),
    format: targetFormat,
    size_bytes: file.size_bytes,
    record_count: file.records,
    status: 'READY',
  };
}

function existingOutputDescriptor(row) {
  const filePath = path.join(dataforgeConfig.storage.resultRoot, row.relative_path || '');
  return {
    file_name: row.stored_name,
    file_path: filePath,
    size_bytes: Number(row.size_bytes || 0),
    records: Number(row.record_count || 0),
  };
}

async function processBatch({
  batchId,
  batchName,
  converter,
  files,
  sourceFormat,
  targetFormat,
  templateCode,
  options = {},
  resumeState = null,
}) {
  const resultDir = path.join(dataforgeConfig.storage.resultRoot, batchId);
  const outputDir = path.join(resultDir, 'output');
  ensureDir(outputDir);

  try {
    await transitionOrControl(batchId, [STATUS.QUEUED], STATUS.VALIDATING, {
      error_message: null,
      validation_errors: null,
    });

    const outputRows = await ConversionFileModel.listByBatchIdAndRole(batchId, 'OUTPUT');
    const existingOutputs = outputRows.map(existingOutputDescriptor);

    const conversion = await converter.convert({
      files,
      outputDir,
      batchName,
      templateCode,
      options,
      resumeState,
      existingOutputs,
      maxPartSizeBytes: dataforgeConfig.output.maxPartSizeBytes,
      onValidated: async (meta = {}) => {
        if (meta.total_records !== undefined) {
          const alive = await ConversionBatchModel.updateProgress(batchId, {
            totalRecords: meta.total_records,
          });
          if (!alive) throw controlError('CONVERSION_CANCELLED', 'Conversion batch was cancelled');
        }

        await transitionOrControl(batchId, [STATUS.VALIDATING], STATUS.PROCESSING);
      },
      onOutput: async (file) => {
        await assertRunnable(batchId);
        await ConversionFileModel.replaceGeneratedFile(batchId, outputRow(batchId, file, targetFormat));
        await assertRunnable(batchId);
      },
      onProgress: async ({
        processedFiles,
        progressPercent,
        totalRecords,
        checkpointData,
      }) => {
        const alive = await ConversionBatchModel.updateProgress(batchId, {
          processedInputFiles: processedFiles,
          progressPercent,
          totalRecords,
          checkpointData,
        });
        if (!alive) throw controlError('CONVERSION_CANCELLED', 'Conversion batch was cancelled');
        await assertRunnable(batchId);
      },
    });

    await assertRunnable(batchId);

    for (const file of conversion.files) {
      await ConversionFileModel.replaceGeneratedFile(batchId, outputRow(batchId, file, targetFormat));
    }

    await transitionOrControl(batchId, [STATUS.PROCESSING], STATUS.COMPLETING);

    const safeBatchName = sanitizeReadableFileName(batchName);
    const zipName = `${safeBatchName}.zip`;
    const zipPath = path.join(resultDir, zipName);
    const completedAt = new Date();
    const expiresAt = calculateExpiry(
      completedAt,
      dataforgeConfig.expiry.hours,
      dataforgeConfig.expiry.dailyCutoff
    );

    const manifest = {
      batch_id: batchId,
      batch_name: batchName,
      source_format: sourceFormat,
      target_format: targetFormat,
      template_code: templateCode || null,
      total_input_files: files.length,
      total_output_files: conversion.files.length,
      total_records: conversion.totalRecords,
      schema: conversion.schema || null,
      completed_at: completedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      output_files: conversion.files.map((file) => ({
        file_name: file.file_name,
        archive_name: file.archive_name || file.file_name,
        size_bytes: file.size_bytes,
        record_count: file.records,
      })),
    };

    const archive = await ArchiveService.createZip({
      zipPath,
      files: conversion.files,
      manifest,
      timeoutMs: dataforgeConfig.output.archiveTimeoutMs,
    });

    await assertRunnable(batchId);

    await ConversionFileModel.replaceGeneratedFile(batchId, {
      file_role: 'ARCHIVE',
      original_name: null,
      stored_name: zipName,
      relative_path: path.relative(dataforgeConfig.storage.resultRoot, zipPath),
      format: 'ZIP',
      size_bytes: archive.sizeBytes,
      record_count: conversion.totalRecords,
      status: 'READY',
    });

    await ConversionBatchModel.updateStatus(batchId, STATUS.COMPLETED, {
      processed_input_files: files.length,
      total_output_files: conversion.files.length,
      total_records: conversion.totalRecords,
      progress_percent: 100,
      zip_file_name: zipName,
      zip_file_path: zipPath,
      zip_size_bytes: archive.sizeBytes,
      completed_at: completedAt,
      expires_at: expiresAt,
      error_message: null,
      validation_errors: null,
      checkpoint_data: null,
      paused_at: null,
      pause_expires_at: null,
    });

    CleanupService.removeBatchTemp(batchId);

    if (expiresAt <= new Date()) {
      removeDir(resultDir);
      await ConversionBatchModel.updateStatus(batchId, STATUS.EXPIRED, {
        zip_file_path: null,
        deleted_at: new Date(),
      });
    }
  } catch (err) {
    if (err.code === 'CONVERSION_CANCELLED') {
      try { CleanupService.removeBatchTemp(batchId); } catch (_) { /* best effort */ }
      try { CleanupService.removeBatchResult(batchId); } catch (_) { /* best effort */ }
      return;
    }

    if (err.code === 'CONVERSION_PAUSED') {
      const batch = await ConversionBatchModel.findById(batchId);
      if (!batch) {
        try { CleanupService.removeBatchTemp(batchId); } catch (_) { /* best effort */ }
        try { CleanupService.removeBatchResult(batchId); } catch (_) { /* best effort */ }
        return;
      }

      const pausedAt = new Date();
      await ConversionBatchModel.updateStatus(batchId, STATUS.PAUSED, {
        paused_at: pausedAt,
        pause_expires_at: addHours(pausedAt, dataforgeConfig.expiry.pausedHours),
        error_message: null,
      });
      return;
    }

    const batch = await ConversionBatchModel.findById(batchId);
    if (!batch) {
      try { CleanupService.removeBatchTemp(batchId); } catch (_) { /* best effort */ }
      try { CleanupService.removeBatchResult(batchId); } catch (_) { /* best effort */ }
      return;
    }

    const rejected = err.code === 'SCHEMA_VALIDATION_FAILED' || err.code === 'TEMPLATE_COLUMN_MISSING';
    await ConversionBatchModel.updateStatus(batchId, rejected ? STATUS.REJECTED : STATUS.FAILED, {
      error_message: err.message,
      validation_errors: err.validationErrors || null,
    });

    await ConversionFileModel.deleteGeneratedFiles(batchId);
    CleanupService.removeBatchTemp(batchId);
    removeDir(resultDir);
    console.error(`[conversion] batch ${batchId} failed:`, err.message);
  }
}

async function requestPause(batchId) {
  const batch = await ConversionBatchModel.findById(batchId);
  if (!batch) return null;

  if (!batch.source_format || !batch.target_format) {
    const err = new Error('Conversion format is invalid');
    err.statusCode = 409;
    err.code = 'CONVERSION_FORMAT_INVALID';
    throw err;
  }

  const converter = ConverterRegistry.resolve(batch.source_format, batch.target_format);
  if (!converter?.supportsPauseResume) {
    const err = new Error('Pause/resume belum didukung untuk converter ini');
    err.statusCode = 409;
    err.code = 'PAUSE_RESUME_NOT_SUPPORTED';
    throw err;
  }

  const allowed = [STATUS.QUEUED, STATUS.VALIDATING, STATUS.PROCESSING];
  if (!allowed.includes(batch.status)) {
    const err = new Error(`Batch dengan status ${batch.status} tidak dapat dipause`);
    err.statusCode = 409;
    err.code = 'BATCH_NOT_PAUSABLE';
    throw err;
  }

  const changed = await ConversionBatchModel.transitionStatus(batchId, allowed, STATUS.PAUSING);
  if (!changed) {
    const latest = await ConversionBatchModel.findById(batchId);
    const err = new Error(`Batch dengan status ${latest?.status || 'UNKNOWN'} tidak dapat dipause`);
    err.statusCode = 409;
    err.code = 'BATCH_NOT_PAUSABLE';
    throw err;
  }

  return ConversionBatchModel.findById(batchId);
}

async function continueBatch(batchId) {
  const batch = await ConversionBatchModel.findById(batchId);
  if (!batch) return null;

  if (batch.status !== STATUS.PAUSED) {
    const err = new Error(`Batch dengan status ${batch.status} tidak dapat dilanjutkan`);
    err.statusCode = 409;
    err.code = 'BATCH_NOT_RESUMABLE';
    throw err;
  }

  if (batch.pause_expires_at && new Date(batch.pause_expires_at) <= new Date()) {
    await CleanupService.deleteBatchCompletely(batchId);
    const err = new Error('Masa simpan pause 48 jam sudah berakhir. Batch telah dihapus.');
    err.statusCode = 410;
    err.code = 'PAUSED_BATCH_EXPIRED';
    throw err;
  }

  const converter = ConverterRegistry.resolve(batch.source_format, batch.target_format);
  if (!converter?.supportsPauseResume) {
    const err = new Error('Pause/resume belum didukung untuk converter ini');
    err.statusCode = 409;
    err.code = 'PAUSE_RESUME_NOT_SUPPORTED';
    throw err;
  }

  const inputRows = await ConversionFileModel.listByBatchIdAndRole(batchId, 'INPUT');
  const files = inputRows.map((row) => {
    const filePath = path.join(dataforgeConfig.storage.tempRoot, row.relative_path || '');
    return {
      originalname: row.original_name,
      filename: row.stored_name,
      path: filePath,
      size: Number(row.size_bytes || 0),
    };
  });

  const missing = files.find((file) => !file.path || !fs.existsSync(file.path));
  if (missing) {
    const err = new Error(`Input file untuk resume tidak ditemukan: ${missing.originalname || 'unknown'}`);
    err.statusCode = 409;
    err.code = 'RESUME_INPUT_MISSING';
    throw err;
  }

  const changed = await ConversionBatchModel.transitionStatus(batchId, [STATUS.PAUSED], STATUS.QUEUED, {
    paused_at: null,
    pause_expires_at: null,
    error_message: null,
  });
  if (!changed) {
    const err = new Error('Status batch berubah sebelum proses continue dijalankan');
    err.statusCode = 409;
    err.code = 'BATCH_STATE_CHANGED';
    throw err;
  }

  const options = parseJson(batch.conversion_options, {}) || {};
  const resumeState = parseJson(batch.checkpoint_data, {}) || {};

  setImmediate(() => {
    processBatch({
      batchId: batch.id,
      batchName: batch.batch_name,
      converter,
      files,
      sourceFormat: batch.source_format,
      targetFormat: batch.target_format,
      templateCode: batch.template_code,
      options,
      resumeState,
    }).catch((error) => console.error('[conversion] unhandled resume error:', error));
  });

  return ConversionBatchModel.findById(batchId);
}

async function cancelBatch(batchId) {
  const batch = await ConversionBatchModel.findById(batchId);
  if (!batch) return null;

  const cancellable = [
    STATUS.QUEUED,
    STATUS.VALIDATING,
    STATUS.PROCESSING,
    STATUS.PAUSING,
    STATUS.PAUSED,
    STATUS.COMPLETING,
  ];

  if (!cancellable.includes(batch.status)) {
    const err = new Error(`Batch dengan status ${batch.status} tidak dapat dicancel`);
    err.statusCode = 409;
    err.code = 'BATCH_NOT_CANCELLABLE';
    throw err;
  }

  await CleanupService.deleteBatchCompletely(batchId);
  return batch;
}

module.exports = {
  processBatch,
  requestPause,
  continueBatch,
  cancelBatch,
};
