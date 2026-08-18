const dataforgeConfig = require('../config/dataforge.config');
const CleanupService = require('../services/cleanup.service');

async function runCleanup() {
  try {
    const expiredResults = await CleanupService.cleanupExpiredResults(new Date());
    const expiredPaused = await CleanupService.cleanupExpiredPaused(new Date());

    if (expiredResults > 0) {
      console.log(`[cleanup] removed ${expiredResults} expired conversion result(s)`);
    }
    if (expiredPaused > 0) {
      console.log(`[cleanup] permanently removed ${expiredPaused} expired paused batch(es)`);
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
