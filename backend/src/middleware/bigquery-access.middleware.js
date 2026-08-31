const R = require('../utils/response.util');
const PermissionService = require('../services/permission.service');
const { isITUser } = require('../services/access.service');

async function requireBigQueryLoadPermission(req, res, next) {
  try {
    const permission = await PermissionService.hasPermission(req.user, 'BIGQUERY', 'LOAD_DATA');
    if (!permission.allowed) {
      return R.forbidden(res, 'Permission denied', {
        code: 'PERMISSION_DENIED',
        module: 'BIGQUERY',
        submodule: 'LOAD_DATA',
      });
    }
    req.bigqueryPermission = permission;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireIT(req, res, next) {
  if (!isITUser(req.user)) {
    return R.forbidden(res, 'IT access required', {
      code: 'IT_ACCESS_REQUIRED',
    });
  }
  return next();
}

module.exports = {
  requireBigQueryLoadPermission,
  requireIT,
};
