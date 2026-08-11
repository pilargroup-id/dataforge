const excelToJsonl = require('./excel-to-jsonl/excel-to-jsonl.converter');

const converters = [excelToJsonl];

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

function resolve(sourceFormat, targetFormat) {
  const source = normalize(sourceFormat);
  const target = normalize(targetFormat);
  return converters.find(
    (converter) => converter.sourceFormats.includes(source) && converter.targetFormat === target
  ) || null;
}

function listCapabilities() {
  return converters.map((converter) => ({
    source_formats: converter.sourceFormats,
    target_format: converter.targetFormat,
    supports_batch: true,
    supports_merge: true,
    supports_schema_validation: true,
  }));
}

module.exports = { resolve, listCapabilities };
