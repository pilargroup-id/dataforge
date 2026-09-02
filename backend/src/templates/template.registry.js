const yosePdf = require('./pdf/yose');
const accurate5SalesInvoiceXml = require('./xml/kato/accurate5-sales-invoice');
const accurate5SalesReturnXml = require('./xml/kato/accurate5-sales-return');

const templates = [yosePdf, accurate5SalesInvoiceXml, accurate5SalesReturnXml];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function resolve(type, code) {
  const normalizedType = normalize(type);
  const normalizedCode = normalize(code);

  return templates.find(
    (template) => normalize(template.type) === normalizedType && normalize(template.code) === normalizedCode
  ) || null;
}

function listByType(type) {
  const normalizedType = normalize(type);
  return templates
    .filter((template) => normalize(template.type) === normalizedType)
    .map((template) => ({
      code: template.code,
      name: template.name,
      description: template.description,
      database_code: template.database_code || null,
      transaction_code: template.transaction_code || null,
      requires_branch_code: Boolean(template.requires_branch_code),
    }));
}

module.exports = { resolve, listByType };
