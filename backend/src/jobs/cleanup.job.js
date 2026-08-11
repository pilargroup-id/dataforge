const dataforgeConfig = require('../config/dataforge.config');
const CleanupService = require('../services/cleanup.service');

async function runCleanup() {
  try {
    const deleted = await CleanupService.cleanupExpiredResults(new Date());
    if (deleted > 0) {
      console.log(`[cleanup] removed ${deleted} expired conversion result(s)`);
    }
  } catch (err) {
    console.error('[cleanup] failed:', err.message);
  }
}

function startCleanupJob() {
  const timer = setInterval(runCleanup, dataforgeConfig.expiry.cleanupIntervalMs);
  timer.unref?.();
  return timer;
}

module.exports = { runCleanup, startCleanupJob };
