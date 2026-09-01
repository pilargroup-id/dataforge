const TRUE_VALUES = new Set(['true', 'yes', 'ya']);
const FALSE_VALUES = new Set(['false', 'no', 'tidak']);

function parseBooleanValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim().toLowerCase();

  if (TRUE_VALUES.has(trimmed)) return true;
  if (FALSE_VALUES.has(trimmed)) return false;

  return value;
}

module.exports = { parseBooleanValue };
