const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/conversions', require('./conversion.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/directory', require('./directory.routes'));
router.use('/bigquery', require('./bigquery.routes'));

const { runCleanup, startCleanupJob } = require('../jobs/cleanup.job');
const BigQueryService = require('../services/bigquery.service');
const ConversionService = require('../services/conversion.service');

runCleanup();
startCleanupJob();
BigQueryService.recoverActiveLoads().catch((error) => {
  console.error('[bigquery] startup recovery failed:', error);
});
ConversionService.recoverInterruptedPdfConversions()
  .then((result) => {
    if (result.total > 0) {
      console.log(`[conversion] PDF startup recovery: resumed=${result.resumed}, paused=${result.paused}, failed=${result.failed}`);
    }
  })
  .catch((error) => {
    console.error('[conversion] PDF startup recovery failed:', error);
  });

module.exports = router;
