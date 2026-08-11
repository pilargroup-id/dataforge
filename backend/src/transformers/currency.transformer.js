function parseCurrencyToFloat(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();

  const currencyPattern = /^-?([A-Z]{3}|Rp\.?|[$€£¥₹₽₩฿]|RM|S\$)\s?-?([\d,]+(?:\.\d+)?)$/i;
  const accountingPattern = /^\(([A-Z]{3}|Rp\.?|[$€£¥₹₽₩฿]|RM|S\$)?\s?([\d,]+(?:\.\d+)?)\)$/i;
  const numberWithCommaPattern = /^-?[\d,]+\.\d{2}$/;
  const europeanPattern = /^-?([A-Z]{3}|Rp\.?|[$€£¥₹₽₩฿]|RM|S\$)?\s?-?([\d.]+,\d{2})$/i;
  const europeanAccountingPattern = /^\(([A-Z]{3}|Rp\.?|[$€£¥₹₽₩฿]|RM|S\$)?\s?([\d.]+,\d{2})\)$/i;

  let match = trimmed.match(accountingPattern);
  if (match) {
    const parsed = Number.parseFloat(match[2].replace(/,/g, ''));
    return Number.isNaN(parsed) ? value : Math.round(parsed * -100) / 100;
  }

  match = trimmed.match(currencyPattern);
  if (match) {
    let parsed = Number.parseFloat(match[2].replace(/,/g, ''));
    if (Number.isNaN(parsed)) return value;
    if (trimmed.startsWith('-') || /[A-Z$€£¥₹₽₩฿]-/i.test(trimmed)) parsed = -Math.abs(parsed);
    return Math.round(parsed * 100) / 100;
  }

  match = trimmed.match(europeanAccountingPattern);
  if (match) {
    const parsed = Number.parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
    return Number.isNaN(parsed) ? value : Math.round(parsed * -100) / 100;
  }

  match = trimmed.match(europeanPattern);
  if (match) {
    let parsed = Number.parseFloat(match[2].replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(parsed)) return value;
    if (trimmed.startsWith('-') || /[A-Z$€£¥₹₽₩฿]-/i.test(trimmed)) parsed = -Math.abs(parsed);
    return Math.round(parsed * 100) / 100;
  }

  if (numberWithCommaPattern.test(trimmed)) {
    const parsed = Number.parseFloat(trimmed.replace(/,/g, ''));
    return Number.isNaN(parsed) ? value : Math.round(parsed * 100) / 100;
  }

  return value;
}

module.exports = { parseCurrencyToFloat };
