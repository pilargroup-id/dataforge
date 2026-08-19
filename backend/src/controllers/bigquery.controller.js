const BigQueryService = require('../services/bigquery.service');
const R = require('../utils/response.util');

async function sourceBatches(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await BigQueryService.listSourceBatches(req.user, page, limit);
    return R.paginated(res, result.rows, {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit) || 1,
    }, 'BigQuery JSONL source batches loaded');
  } catch (err) { return next(err); }
}

async function datasets(req, res, next) {
  try {
    const rows = await BigQueryService.listDatasets(req.user);
    return R.ok(res, rows, 'BigQuery datasets loaded');
  } catch (err) { return next(err); }
}

async function tables(req, res, next) {
  try {
    const rows = await BigQueryService.listTables(req.user, req.params.datasetId);
    return R.ok(res, rows, 'BigQuery tables loaded');
  } catch (err) { return next(err); }
}

async function table(req, res, next) {
  try {
    const data = await BigQueryService.getTable(
      req.user,
      req.params.datasetId,
      req.params.tableId
    );
    return R.ok(res, data, 'BigQuery table loaded');
  } catch (err) { return next(err); }
}

async function validate(req, res, next) {
  try {
    const data = await BigQueryService.preflight(req.user, req.body || {});
    return R.ok(
      res,
      data,
      data.validation.valid
        ? 'BigQuery preflight validation passed'
        : 'BigQuery preflight validation failed'
    );
  } catch (err) { return next(err); }
}

async function createLoad(req, res, next) {
  try {
    const job = await BigQueryService.createLoad(req.user, req.body || {});
    return R.created(res, job, 'BigQuery load job created');
  } catch (err) { return next(err); }
}

async function listLoads(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await BigQueryService.listLoads(req.user, page, limit);
    return R.paginated(res, result.rows, {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit) || 1,
    }, 'BigQuery load history loaded');
  } catch (err) { return next(err); }
}

async function showLoad(req, res, next) {
  try {
    const job = await BigQueryService.getLoad(req.user, req.params.id);
    return R.ok(res, job, 'BigQuery load job loaded');
  } catch (err) { return next(err); }
}

async function listAccess(_req, res, next) {
  try {
    const rows = await BigQueryService.listDatasetAccess();
    return R.ok(res, rows, 'BigQuery dataset access assignments loaded');
  } catch (err) { return next(err); }
}

async function createAccess(req, res, next) {
  try {
    const row = await BigQueryService.createDatasetAccess(
      req.body || {},
      req.user.id
    );
    return R.created(res, row, 'BigQuery dataset access assignment created');
  } catch (err) { return next(err); }
}

async function updateAccess(req, res, next) {
  try {
    const row = await BigQueryService.updateDatasetAccess(
      req.params.id,
      req.body || {}
    );
    return R.ok(res, row, 'BigQuery dataset access assignment updated');
  } catch (err) { return next(err); }
}

async function deleteAccess(req, res, next) {
  try {
    const deleted = await BigQueryService.deleteDatasetAccess(req.params.id);
    if (!deleted) {
      return R.notFound(res, 'BigQuery dataset access assignment not found');
    }
    return R.ok(
      res,
      { id: req.params.id, deleted: true },
      'BigQuery dataset access assignment deleted'
    );
  } catch (err) { return next(err); }
}

module.exports = {
  sourceBatches,
  datasets,
  tables,
  table,
  validate,
  createLoad,
  listLoads,
  showLoad,
  listAccess,
  createAccess,
  updateAccess,
  deleteAccess,
};
