const express = require('express');
const config = require('../config');
const ConversionController = require('../controllers/conversion.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');
const { requireSupportedConversionAndPermission } = require('../middleware/conversion-access.middleware');
const { prepareBatchUpload, uploadExcelFolder } = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/', authenticate, requireApp(config.app.slug), ConversionController.list);
router.get('/capabilities', authenticate, requireApp(config.app.slug), ConversionController.capabilities);
router.get('/:id', authenticate, requireApp(config.app.slug), ConversionController.show);
router.get('/:id/download', authenticate, requireApp(config.app.slug), ConversionController.download);

router.post(
  '/:sourceFormat/:targetFormat',
  authenticate,
  requireApp(config.app.slug),
  requireSupportedConversionAndPermission,
  prepareBatchUpload,
  uploadExcelFolder,
  ConversionController.create
);

module.exports = router;
