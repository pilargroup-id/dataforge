const express = require('express');
const config = require('../config');
const DirectoryController = require('../controllers/directory.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');
const { requireIT } = require('../middleware/it-access.middleware');

const router = express.Router();
const guards = [authenticate, requireApp(config.app.slug), requireIT];

router.get('/users', ...guards, DirectoryController.users);
router.get('/departments', ...guards, DirectoryController.departments);

module.exports = router;
