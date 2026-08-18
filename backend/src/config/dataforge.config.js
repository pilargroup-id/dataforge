const path = require('path');

function numberEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be numeric`);
  }
  return value;
}

const backendRoot = path.resolve(__dirname, '..', '..');

module.exports = {
  access: {
    itDepartmentCode: process.env.IT_DEPARTMENT_CODE || 'SIT',
  },
  upload: {
    maxFilesPerBatch: numberEnv('MAX_FILES_PER_BATCH', 20),
    maxFileSizeBytes: numberEnv('MAX_FILE_SIZE_MB', 200) * 1024 * 1024,
    maxBatchSizeBytes: numberEnv('MAX_BATCH_SIZE_MB', 1024) * 1024 * 1024,
  },
  output: {
    maxPartSizeBytes: numberEnv('MAX_OUTPUT_SIZE_MB', 99) * 1024 * 1024,
    archiveTimeoutMs: numberEnv('ARCHIVE_TIMEOUT_MS', 10 * 60 * 1000),
  },
  expiry: {
    hours: numberEnv('RESULT_EXPIRY_HOURS', 6),
    dailyCutoff: process.env.DAILY_CLEANUP_CUTOFF || '20:00',
    lastConversionStart: process.env.LAST_CONVERSION_START_TIME || '19:30',
    cleanupIntervalMs: numberEnv('CLEANUP_INTERVAL_MS', 60000),
    pausedHours: numberEnv('PAUSED_EXPIRY_HOURS', 48),
  },
  storage: {
    tempRoot: path.resolve(backendRoot, process.env.TEMP_STORAGE_PATH || 'storage/temp'),
    resultRoot: path.resolve(backendRoot, process.env.RESULT_STORAGE_PATH || 'storage/results'),
  },
};
