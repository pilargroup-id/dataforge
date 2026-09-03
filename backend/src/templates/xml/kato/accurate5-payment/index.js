const schema = require('./schema');
const builder = require('./xml.builder');

module.exports = {
  type: 'XML',
  code: 'accurate5-payment',
  name: 'KATO - Accurate 5 Payment',
  description: 'KATO mapping untuk export Finance XLS/XLSX menjadi NMEXML CUSTOMERRECEIPT Accurate 5.',
  database_code: 'KATO',
  transaction_code: 'PAYMENT',
  requires_branch_code: true,
  input_mapping_mode: 'HEADER',
  row_mode: 'GROUP_BY_PAYMENT_NUMBER',
  schema,
  ...builder,
};
