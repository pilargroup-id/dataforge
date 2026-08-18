const excelToJsonl = require('./excel-to-jsonl/excel-to-jsonl.converter');
const excelToPdf = require('./excel-to-pdf/excel-to-pdf.converter');
const excelToXml = require('./excel-to-xml/excel-to-xml.converter');
const TemplateRegistry = require('../templates/template.registry');

const converters = [excelToJsonl, excelToPdf, excelToXml];

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
    permission_code: converter.permissionCode,
    input_mode: converter.inputMode || 'batch',
    supports_batch: (converter.inputMode || 'batch') === 'batch',
    supports_merge: converter.targetFormat === 'JSONL',
    supports_schema_validation: true,
    supports_pause_resume: converter.supportsPauseResume === true,
    default_template_code: converter.defaultTemplateCode || null,
    templates: converter.templateType ? TemplateRegistry.listByType(converter.templateType) : [],
  }));
}

module.exports = { resolve, listCapabilities };
