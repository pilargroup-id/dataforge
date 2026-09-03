const schema = require('./schema');
const builder = require('./xml.builder');

module.exports = {
  type: 'XML',
  code: 'accurate5-warehouse-transfer',
  name: 'KATO - Accurate 5 Warehouse Transfer',
  description: 'KATO template untuk convert XLS/XLSX Item Transfer menjadi NMEXML WTRAN Accurate 5.',
  database_code: 'KATO',
  transaction_code: 'WAREHOUSE_TRANSFER',
  requires_branch_code: true,
  input_mapping_mode: 'HEADER',
  row_mode: 'GROUP_BY_TRANSFER_NUMBER',
  schema,
  ...builder,
};
