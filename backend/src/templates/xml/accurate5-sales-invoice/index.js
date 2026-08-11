const schema = require('./schema');
const builder = require('./xml.builder');

module.exports = {
  type: 'XML',
  code: 'accurate5-sales-invoice',
  name: 'Accurate 5 - Sales Invoice',
  description: 'Template NMEXML SALESINVOICE untuk import Sales Invoice ke Accurate 5 Desktop.',
  schema,
  ...builder,
};
