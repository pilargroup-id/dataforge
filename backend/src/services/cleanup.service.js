const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const dataforgeConfig = require('../config/dataforge.config');
const { removeDir } = require('../utils/file.util');
const STATUS = require('../constants/conversion-status.constant');

function safeResultDirectory(batchId) {
  return path.join(dataforgeConfig.storage.resultRoot, String(batchId));
}

function safeTempDirectory(batchId) {
  return path.join(dataforgeConfig.storage.tempRoot, String(batchId));
}

async function cleanupExpiredResults(now = new Date()) {
  const expired = await ConversionBatchModel.listExpired(now);
  let deleted = 0;

  for (const batch of expired) {
    removeDir(safeResultDirectory(batch.id));

    await ConversionBatchModel.updateStatus(batch.id, STATUS.EXPIRED, {
      zip_file_path: null,
      deleted_at: now,
    });
    deleted += 1;
  }

  return deleted;
}

async function cleanupExpiredPaused(now = new Date()) {
  const expired = await ConversionBatchModel.listExpiredPaused(now);
  let deleted = 0;

  for (const batch of expired) {
    await deleteBatchCompletely(batch.id);
    deleted += 1;
  }

  return deleted;
}

async function deleteBatchCompletely(batchId) {
  const deleted = await ConversionBatchModel.deleteById(batchId);

  try { removeDir(safeTempDirectory(batchId)); } catch (_) { /* running process may still hold a file */ }
  try { removeDir(safeResultDirectory(batchId)); } catch (_) { /* running process may still hold a file */ }

  return deleted;
}

function removeBatchTemp(batchId) {
  removeDir(safeTempDirectory(batchId));
}

function removeBatchResult(batchId) {
  removeDir(safeResultDirectory(batchId));
}

module.exports = {
  cleanupExpiredResults,
  cleanupExpiredPaused,
  deleteBatchCompletely,
  removeBatchTemp,
  removeBatchResult,
};
