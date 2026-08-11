const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/conversions', require('./conversion.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/directory', require('./directory.routes'));

const { runCleanup, startCleanupJob } = require('../jobs/cleanup.job');
runCleanup();
startCleanupJob();

module.exports = router;
