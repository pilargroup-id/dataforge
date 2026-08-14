const express = require('express');
const config = require('../config');
const PermissionController = require('../controllers/permission.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');
const { requirePermission } = require('../middleware/permission-access.middleware');

const router = express.Router();

const requireAdministration = requirePermission('ADMINISTRATION', 'PERMISSION_MANAGE');

router.get('/me', authenticate, requireApp(config.app.slug), PermissionController.me);
router.get('/catalog', authenticate, requireApp(config.app.slug), requireAdministration, PermissionController.catalog);
router.get('/', authenticate, requireApp(config.app.slug), requireAdministration, PermissionController.index);
router.post('/', authenticate, requireApp(config.app.slug), requireAdministration, PermissionController.store);
router.put('/:id', authenticate, requireApp(config.app.slug), requireAdministration, PermissionController.update);
router.delete('/:id', authenticate, requireApp(config.app.slug), requireAdministration, PermissionController.destroy);

module.exports = router;
