const config = require('../config');
const AuthService = require('../services/auth.service');
const R = require('../utils/response.util');

function getBearerToken(req) {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token] = String(header).split(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token
  ) {
    return null;
  }

  return token.trim();
}

async function authenticate(req, res, next) {
  const bearerToken = getBearerToken(req);

  try {
    const auth = await AuthService.resolveAuth(
      bearerToken
    );

    req.auth = auth.payload;
    req.user = auth.user;
    req.accessToken = auth.token;

    return next();
  } catch (err) {
    if (err.statusCode === 401) {
      return R.unauthorized(
        res,
        err.message,
        {
          code: err.code || 'TOKEN_INVALID',
        }
      );
    }

    if (err.statusCode === 403) {
      return R.forbidden(
        res,
        err.message,
        {
          code: err.code || 'AUTH_FORBIDDEN',
        }
      );
    }

    return next(err);
  }
}

function requireApp(appSlug = config.app.slug) {
  return function requireAppMiddleware(
    req,
    res,
    next
  ) {
    const apps = Array.isArray(req.user?.apps)
      ? req.user.apps
      : [];

    if (!apps.includes(appSlug)) {
      return R.forbidden(
        res,
        `User does not have access to ${appSlug}`,
        {
          code: 'APP_FORBIDDEN',
          app: appSlug,
        }
      );
    }

    return next();
  };
}

function requireJobLevel(minimumLevel) {
  return function requireJobLevelMiddleware(
    req,
    res,
    next
  ) {
    const value = Number(
      req.user?.job_level_value
    );

    if (
      !Number.isFinite(value) ||
      value < Number(minimumLevel)
    ) {
      return R.forbidden(
        res,
        'Insufficient job level',
        {
          code: 'JOB_LEVEL_FORBIDDEN',
          minimum_job_level_value:
            Number(minimumLevel),
        }
      );
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireApp,
  requireJobLevel,
};