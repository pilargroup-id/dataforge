const express = require('express');
const config = require('../config');
const BigQueryController = require('../controllers/bigquery.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');
const {
  requireBigQueryLoadPermission,
  requireIT,
} = require('../middleware/bigquery-access.middleware');

const router = express.Router();
const appAccess = [authenticate, requireApp(config.app.slug)];
const loadAccess = [...appAccess, requireBigQueryLoadPermission];
const itAccess = [...appAccess, requireIT];

router.get('/source-batches', ...loadAccess, BigQueryController.sourceBatches);

router.get('/datasets', ...loadAccess, BigQueryController.datasets);
router.get('/datasets/:datasetId/tables', ...loadAccess, BigQueryController.tables);
router.get('/datasets/:datasetId/tables/:tableId', ...loadAccess, BigQueryController.table);

router.post('/validate', ...loadAccess, BigQueryController.validate);

router.get('/loads', ...loadAccess, BigQueryController.listLoads);
router.get('/loads/:id', ...loadAccess, BigQueryController.showLoad);
router.post('/loads', ...loadAccess, BigQueryController.createLoad);

router.get('/access', ...itAccess, BigQueryController.listAccess);
router.post('/access', ...itAccess, BigQueryController.createAccess);
router.put('/access/:id', ...itAccess, BigQueryController.updateAccess);
router.delete('/access/:id', ...itAccess, BigQueryController.deleteAccess);

module.exports = router;
