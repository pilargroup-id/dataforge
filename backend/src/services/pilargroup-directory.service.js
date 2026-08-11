const config = require('../config');

function createHttpError(message, statusCode = 500, code = 'PILARGROUP_DIRECTORY_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function get(pathname) {
  const secret = process.env.INTERNAL_SYNC_SECRET;
  if (!secret) {
    throw createHttpError('INTERNAL_SYNC_SECRET is not configured', 500, 'INTERNAL_SYNC_SECRET_MISSING');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.auth.meTimeoutMs);

  try {
    const response = await fetch(`${config.auth.pilargroupUrl}${pathname}`, {
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': secret,
      },
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw createHttpError(
        body?.message || 'Failed to fetch PilarGroup directory',
        response.status || 502,
        body?.code || 'PILARGROUP_DIRECTORY_REQUEST_FAILED'
      );
    }

    const data = body?.data;
    if (!Array.isArray(data)) {
      throw createHttpError('Invalid PilarGroup directory response', 502, 'PILARGROUP_DIRECTORY_INVALID_RESPONSE');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createHttpError('PilarGroup directory timeout', 504, 'PILARGROUP_DIRECTORY_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  getUsers: () => get('/api/internal/directory/users'),
  getDepartments: () => get('/api/internal/directory/departments'),
};
