const fs = require('fs');
const path = require('path');
const ConversionBatchModel = require('../models/conversion-batch.model');
const dataforgeConfig = require('../config/dataforge.config');
const { removeDir } = require('../utils/file.util');
const STATUS = require('../constants/conversion-status.constant');

function safeResultDirectory(batchId) {
  return path.join(dataforgeConfig.storage.resultRoot, String(batchId));
}

async function cleanupExpiredResults(now = new Date()) {
  const expired = await ConversionBatchModel.listExpired(now);
  let deleted = 0;

  for (const batch of expired) {
    const resultDir = safeResultDirectory(batch.id);
    removeDir(resultDir);

    await ConversionBatchModel.updateStatus(batch.id, STATUS.EXPIRED, {
      zip_file_path: null,
      deleted_at: now,
    });
    deleted += 1;
  }

  return deleted;
}

function removeBatchTemp(batchId) {
  removeDir(path.join(dataforgeConfig.storage.tempRoot, String(batchId)));
}

module.exports = {
  cleanupExpiredResults,
  removeBatchTemp,
};
