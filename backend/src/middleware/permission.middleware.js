const R = require('../utils/response.util');
const PermissionService = require('../services/permission.service');

function requirePermission(moduleCode, submoduleCode = null) {
  return async function permissionMiddleware(req, res, next) {
    try {
      const result = await PermissionService.hasPermission(req.user, moduleCode, submoduleCode);
      if (!result.allowed) {
        return R.forbidden(res, 'Permission denied', {
          code: 'PERMISSION_DENIED',
          module: moduleCode,
          submodule: submoduleCode,
        });
      }
      req.permission = result;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requirePermission };
