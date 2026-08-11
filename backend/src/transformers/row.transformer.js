const { cleanHeader } = require('./header.transformer');
const { convertToStandardDate } = require('./date.transformer');
const { parseCurrencyToFloat } = require('./currency.transformer');

function processRowData(row) {
  const processed = {};

  for (const [key, rawValue] of Object.entries(row)) {
    const cleanKey = cleanHeader(key);
    let value = rawValue;

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      processed[cleanKey] = null;
      continue;
    }

    if (typeof value === 'string' && ['--', '—', '−'].includes(value.trim())) {
      processed[cleanKey] = null;
      continue;
    }

    const currency = parseCurrencyToFloat(value);
    if (currency !== value) {
      processed[cleanKey] = currency;
      continue;
    }

    value = convertToStandardDate(value);
    processed[cleanKey] = value;
  }

  return processed;
}

module.exports = { processRowData };
