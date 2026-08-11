const yosePdf = require('./pdf/yose');
const accurate5SalesInvoiceXml = require('./xml/accurate5-sales-invoice');

const templates = [yosePdf, accurate5SalesInvoiceXml];

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
    }));
}

module.exports = { resolve, listByType };
