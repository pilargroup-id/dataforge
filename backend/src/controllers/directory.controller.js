const DirectoryService = require('../services/pilargroup-directory.service');
const R = require('../utils/response.util');

async function users(_req, res, next) {
  try { return R.ok(res, await DirectoryService.getUsers(), 'Users loaded'); }
  catch (err) { return next(err); }
}

async function departments(_req, res, next) {
  try { return R.ok(res, await DirectoryService.getDepartments(), 'Departments loaded'); }
  catch (err) { return next(err); }
}

module.exports = { users, departments };
