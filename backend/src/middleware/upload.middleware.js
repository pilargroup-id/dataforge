const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const dataforgeConfig = require('../config/dataforge.config');
const R = require('../utils/response.util');
const { ensureDir, isExcelFile, removeDir } = require('../utils/file.util');

function prepareBatchUpload(req, _res, next) {
  req.batchUploadId = crypto.randomUUID();
  req.batchTempDir = path.join(dataforgeConfig.storage.tempRoot, req.batchUploadId);
  req.batchInputDir = path.join(req.batchTempDir, 'input');
  ensureDir(req.batchInputDir);
  next();
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    cb(null, req.batchInputDir);
  },
  filename(_req, file, cb) {
    const safeBase = path.basename(file.originalname).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    cb(null, `${crypto.randomUUID()}__${safeBase}`);
  },
});

const uploader = multer({
  storage,
  limits: {
    files: dataforgeConfig.upload.maxFilesPerBatch,
    fileSize: dataforgeConfig.upload.maxFileSizeBytes,
  },
  fileFilter(_req, file, cb) {
    if (!isExcelFile(file.originalname)) {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'files');
      err.message = `Unsupported file format: ${file.originalname}`;
      return cb(err);
    }
    return cb(null, true);
  },
}).array('files', dataforgeConfig.upload.maxFilesPerBatch);

function uploadExcelFolder(req, res, next) {
  uploader(req, res, (err) => {
    if (err) {
      removeDir(req.batchTempDir);
      if (err instanceof multer.MulterError) {
        return R.badRequest(res, err.message, {
          code: err.code || 'UPLOAD_ERROR',
        });
      }
      return next(err);
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      removeDir(req.batchTempDir);
      return R.badRequest(res, 'At least one XLS/XLSX file is required', {
        code: 'FILES_REQUIRED',
      });
    }

    const totalBytes = files.reduce((sum, file) => sum + Number(file.size || 0), 0);
    if (totalBytes > dataforgeConfig.upload.maxBatchSizeBytes) {
      removeDir(req.batchTempDir);
      return R.badRequest(res, 'Total batch size exceeds the allowed limit', {
        code: 'BATCH_SIZE_LIMIT_EXCEEDED',
        max_batch_size_bytes: dataforgeConfig.upload.maxBatchSizeBytes,
        actual_batch_size_bytes: totalBytes,
      });
    }

    return next();
  });
}

module.exports = {
  prepareBatchUpload,
  uploadExcelFolder,
};
