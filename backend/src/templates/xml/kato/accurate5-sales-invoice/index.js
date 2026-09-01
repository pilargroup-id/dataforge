const schema = require('./schema');
const builder = require('./xml.builder');

module.exports = {
  type: 'XML',
  code: 'accurate5-sales-invoice',
  name: 'KATO - Accurate 5 Sales Invoice',
  description: 'KATO mapping untuk export Finance XLS/XLSX menjadi NMEXML SALESINVOICE Accurate 5.',
  database_code: 'KATO',
  transaction_code: 'SALES_INVOICE',
  requires_branch_code: true,
  input_mapping_mode: 'HEADER',
  row_mode: 'ONE_ROW_ONE_SALESINVOICE',
  schema,
  ...builder,
};
