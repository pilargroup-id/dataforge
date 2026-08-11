const { resolveColumns } = require('./invoice.mapping');
const { createInvoicePdf } = require('./invoice.template');

module.exports = {
  type: 'PDF',
  code: 'yose',
  name: 'Invoice Yose',
  description: 'Template invoice PDF per nomor invoice, dimigrasikan dari BillForge.',
  resolveColumns,
  createInvoicePdf,
};
