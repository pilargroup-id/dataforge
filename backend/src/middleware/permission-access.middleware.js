const R = require('../utils/response.util');
const PermissionService = require('../services/permission.service');

function requirePermission(moduleCode, submoduleCode = null) {
  return async function requirePermissionMiddleware(req, res, next) {
    try {
      const { allowed } = await PermissionService.hasPermission(req.user, moduleCode, submoduleCode);

      if (!allowed) {
        return R.forbidden(res, 'You do not have access to this feature', {
          code: 'PERMISSION_REQUIRED',
          module: moduleCode,
          submodule: submoduleCode,
        });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requirePermission };
