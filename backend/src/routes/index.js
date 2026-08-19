const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/conversions', require('./conversion.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/directory', require('./directory.routes'));
router.use('/bigquery', require('./bigquery.routes'));

const { runCleanup, startCleanupJob } = require('../jobs/cleanup.job');
const BigQueryService = require('../services/bigquery.service');

runCleanup();
startCleanupJob();
BigQueryService.recoverActiveLoads().catch((error) => {
  console.error('[bigquery] startup recovery failed:', error);
});

module.exports = router;
