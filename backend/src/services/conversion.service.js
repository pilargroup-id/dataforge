const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const ConversionFileModel = require('../models/conversion-file.model');
const ArchiveService = require('./archive.service');
const CleanupService = require('./cleanup.service');
const dataforgeConfig = require('../config/dataforge.config');
const STATUS = require('../constants/conversion-status.constant');
const { calculateExpiry } = require('../utils/date.util');
const { ensureDir, sanitizeReadableFileName, removeDir } = require('../utils/file.util');

async function processBatch({ batchId, batchName, converter, files, sourceFormat, targetFormat, templateCode, options = {} }) {
  const resultDir = path.join(dataforgeConfig.storage.resultRoot, batchId);
  const outputDir = path.join(resultDir, 'output');
  ensureDir(outputDir);

  try {
    await ConversionBatchModel.updateStatus(batchId, STATUS.VALIDATING, { progress_percent: 0 });

    const conversion = await converter.convert({
      files,
      outputDir,
      batchName,
      templateCode,
      options,
      maxPartSizeBytes: dataforgeConfig.output.maxPartSizeBytes,
      onValidated: () => ConversionBatchModel.updateStatus(batchId, STATUS.PROCESSING, { progress_percent: 0 }),
      onProgress: ({ processedFiles, progressPercent }) =>
        ConversionBatchModel.updateProgress(batchId, processedFiles, progressPercent),
    });

    const outputFileRows = conversion.files.map((file) => ({
      file_role: 'OUTPUT',
      original_name: null,
      stored_name: file.file_name,
      relative_path: path.relative(dataforgeConfig.storage.resultRoot, file.file_path),
      format: targetFormat,
      size_bytes: file.size_bytes,
      record_count: file.records,
      status: 'READY',
    }));
    await ConversionFileModel.insertMany(batchId, outputFileRows);

    const safeBatchName = sanitizeReadableFileName(batchName);
    const zipName = `${safeBatchName}.zip`;
    const zipPath = path.join(resultDir, zipName);
    const completedAt = new Date();
    const expiresAt = calculateExpiry(completedAt, dataforgeConfig.expiry.hours, dataforgeConfig.expiry.dailyCutoff);

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

    const archive = await ArchiveService.createZip({ zipPath, files: conversion.files, manifest });

    await ConversionFileModel.insertMany(batchId, [{
      file_role: 'ARCHIVE',
      original_name: null,
      stored_name: zipName,
      relative_path: path.relative(dataforgeConfig.storage.resultRoot, zipPath),
      format: 'ZIP',
      size_bytes: archive.sizeBytes,
      record_count: conversion.totalRecords,
      status: 'READY',
    }]);

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
    const rejected = err.code === 'SCHEMA_VALIDATION_FAILED' || err.code === 'TEMPLATE_COLUMN_MISSING';
    await ConversionBatchModel.updateStatus(batchId, rejected ? STATUS.REJECTED : STATUS.FAILED, {
      error_message: err.message,
      validation_errors: err.validationErrors || null,
      progress_percent: 0,
    });
    CleanupService.removeBatchTemp(batchId);
    removeDir(resultDir);
    console.error(`[conversion] batch ${batchId} failed:`, err.message);
  }
}

module.exports = { processBatch };
