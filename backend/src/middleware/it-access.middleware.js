const R = require('../utils/response.util');
const { isITUser } = require('../services/access.service');

function requireIT(req, res, next) {
  if (!isITUser(req.user)) {
    return R.forbidden(res, 'IT access is required', {
      code: 'IT_ACCESS_REQUIRED',
    });
  }

  return next();
}

module.exports = { requireIT };
