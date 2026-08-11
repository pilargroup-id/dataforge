const express = require('express');
const config = require('../config');
const PermissionController = require('../controllers/permission.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');
const { requireIT } = require('../middleware/it-access.middleware');

const router = express.Router();

router.get('/me', authenticate, requireApp(config.app.slug), PermissionController.me);
router.get('/catalog', authenticate, requireApp(config.app.slug), requireIT, PermissionController.catalog);
router.get('/', authenticate, requireApp(config.app.slug), requireIT, PermissionController.index);
router.post('/', authenticate, requireApp(config.app.slug), requireIT, PermissionController.store);
router.put('/:id', authenticate, requireApp(config.app.slug), requireIT, PermissionController.update);
router.delete('/:id', authenticate, requireApp(config.app.slug), requireIT, PermissionController.destroy);

module.exports = router;
