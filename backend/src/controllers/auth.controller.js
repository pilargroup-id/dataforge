const R = require('../utils/response.util');

async function me(req, res) {
  return R.ok(res, req.user, 'Authenticated');
}

module.exports = {
  me,
};
