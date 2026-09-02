const schema = require('./schema');
const builder = require('./xml.builder');

module.exports = {
  type: 'XML',
  code: 'accurate5-sales-return',
  name: 'KATO - Accurate 5 Sales Return',
  description: 'KATO mapping untuk export Finance XLS/XLSX menjadi NMEXML SALESRETURN Accurate 5.',
  database_code: 'KATO',
  transaction_code: 'SALES_RETURN',
  requires_branch_code: true,
  input_mapping_mode: 'HEADER',
  row_mode: 'ONE_ROW_ONE_SALESRETURN',
  schema,
  ...builder,
};
