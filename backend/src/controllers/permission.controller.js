const PermissionService = require('../services/permission.service');
const R = require('../utils/response.util');

async function me(req, res, next) {
  try {
    return R.ok(res, await PermissionService.getMyPermissions(req.user), 'Permissions loaded');
  } catch (err) {
    return next(err);
  }
}


async function catalog(_req, res, next) {
  try {
    return R.ok(res, await PermissionService.getCatalog(), 'Permission catalog loaded');
  } catch (err) {
    return next(err);
  }
}

async function index(_req, res, next) {
  try {
    return R.ok(res, await PermissionService.listAssignments(), 'Permission assignments loaded');
  } catch (err) {
    return next(err);
  }
}

async function store(req, res, next) {
  try {
    const data = await PermissionService.createAssignment(req.body, req.user.id);
    return R.created(res, data, 'Permission assignment created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await PermissionService.updateAssignment(req.params.id, req.body);
    return R.ok(res, data, 'Permission assignment updated');
  } catch (err) {
    return next(err);
  }
}

async function destroy(req, res, next) {
  try {
    const deleted = await PermissionService.deleteAssignment(req.params.id);
    if (!deleted) return R.notFound(res, 'Permission assignment not found');
    return R.ok(res, null, 'Permission assignment deleted');
  } catch (err) {
    return next(err);
  }
}

module.exports = { me, catalog, index, store, update, destroy };
