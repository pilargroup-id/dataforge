/**
 * Standard response format.
 *
 * Success   : { success: true,  message, data }
 * Error     : { success: false, message, errors? }
 * Paginated : { success: true,  message, data, meta }
 */

function ok(res, data = null, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data = null, message = 'Created') {
  return ok(res, data, message, 201);
}

function paginated(res, data = [], meta = {}, message = 'OK') {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? data.length,
      total: meta.total ?? data.length,
      totalPages: meta.totalPages ?? meta.total_page ?? meta.total_pages ?? 1,
    },
  });
}

function error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function badRequest(res, message = 'Bad Request', errors = null) {
  return error(res, message, 400, errors);
}

function unauthorized(res, message = 'Unauthorized', errors = null) {
  return error(res, message, 401, errors);
}

function forbidden(res, message = 'Forbidden', errors = null) {
  return error(res, message, 403, errors);
}

function notFound(res, message = 'Not Found') {
  return error(res, message, 404);
}

module.exports = {
  ok,
  created,
  paginated,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
};
