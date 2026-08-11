const jwt = require('jsonwebtoken');
const config = require('../config');

function createAuthError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);

    if (!payload || typeof payload !== 'object') {
      throw createAuthError('Invalid token payload', 401, 'TOKEN_INVALID_PAYLOAD');
    }

    return payload;
  } catch (err) {
    if (err.statusCode) throw err;

    if (err.name === 'TokenExpiredError') {
      throw createAuthError('Token expired', 401, 'TOKEN_EXPIRED');
    }

    throw createAuthError('Invalid token', 401, 'TOKEN_INVALID');
  }
}

function extractData(body) {
  if (!body || typeof body !== 'object') return null;
  return body.data && typeof body.data === 'object' ? body.data : body;
}

async function fetchCurrentUser(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.auth.meTimeoutMs);

  try {
    const response = await fetch(`${config.auth.pilargroupUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    let body = null;

    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }

    if (response.status === 401) {
      const code = body?.errors?.code || body?.code || 'TOKEN_REVOKED';
      throw createAuthError(body?.message || 'Authentication rejected by PilarGroup', 401, code);
    }

    if (response.status === 403) {
      throw createAuthError(body?.message || 'Access forbidden by PilarGroup', 403, 'AUTH_FORBIDDEN');
    }

    if (!response.ok) {
      const err = new Error(body?.message || 'Failed to load user profile from PilarGroup');
      err.statusCode = 502;
      err.code = 'AUTH_UPSTREAM_ERROR';
      throw err;
    }

    const user = extractData(body);

    if (!user?.id) {
      throw createAuthError('Invalid user profile returned by PilarGroup', 401, 'USER_NOT_FOUND');
    }

    if (user.is_active !== undefined && Number(user.is_active) !== 1) {
      throw createAuthError('User is inactive', 401, 'USER_INACTIVE');
    }

    return user;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('PilarGroup auth service timeout');
      timeoutError.statusCode = 504;
      timeoutError.code = 'AUTH_UPSTREAM_TIMEOUT';
      throw timeoutError;
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  verifyAccessToken,
  fetchCurrentUser,
};
