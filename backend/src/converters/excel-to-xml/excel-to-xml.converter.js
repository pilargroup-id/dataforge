const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const TemplateRegistry = require('../../templates/template.registry');
const { sanitizeReadableFileName } = require('../../utils/file.util');

async function convert({ files, outputDir, batchName, templateCode, options = {}, onValidated, onProgress }) {
  if (files.length !== 1) {
    const err = new Error('EXCEL_TO_XML hanya menerima 1 file Excel per batch');
    err.code = 'INPUT_FILE_COUNT_INVALID';
    throw err;
  }

  const template = TemplateRegistry.resolve('XML', templateCode);
  if (!template) {
    const err = new Error(`Template XML tidak ditemukan: ${templateCode}`);
    err.code = 'TEMPLATE_NOT_FOUND';
    throw err;
  }

  const workbook = XLSX.readFile(files[0].path, { cellDates: true });
  const requestedSheet = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === template.schema.sheetName.toLowerCase()
  );
  const sheetName = requestedSheet || workbook.SheetNames[0];
  if (!sheetName) {
    const err = new Error('Workbook tidak memiliki sheet');
    err.code = 'EMPTY_WORKBOOK';
    throw err;
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const rows = template.parseRows(rawRows, template.schema);
  const { invoices, errors } = template.groupInvoices(rows, template.schema.dataStartRow);
  const blockingErrors = errors.filter((error) => error.level === 'error');
  if (blockingErrors.length) {
    const err = new Error('Data Excel tidak valid untuk template Accurate 5 Sales Invoice');
    err.code = 'SCHEMA_VALIDATION_FAILED';
    err.validationErrors = {
      template_code: template.code,
      sheet_name: sheetName,
      errors,
    };
    throw err;
  }

  if (!invoices.length) {
    const err = new Error('Tidak ada invoice yang dapat dikonversi');
    err.code = 'NO_INVOICE_DATA';
    throw err;
  }

  if (onValidated) {
    await onValidated({
      template_code: template.code,
      sheet_name: sheetName,
      columns: template.schema.columns,
    });
  }

  const branchCode = String(options.branch_code || template.schema.defaultBranchCode).trim();
  const xml = template.buildXml(invoices, branchCode);
  const xmlName = `${sanitizeReadableFileName(batchName, 'sales_invoice')}.xml`;
  const xmlPath = path.join(outputDir, xmlName);
  fs.writeFileSync(xmlPath, xml, 'utf8');

  if (onProgress) await onProgress({ processedFiles: 1, totalFiles: 1, progressPercent: 100 });

  return {
    schema: {
      template_code: template.code,
      sheet_name: sheetName,
      columns: template.schema.columns,
      branch_code: branchCode,
    },
    files: [{
      file_name: xmlName,
      file_path: xmlPath,
      size_bytes: fs.statSync(xmlPath).size,
      records: invoices.length,
    }],
    totalRecords: invoices.length,
  };
}

module.exports = {
  key: 'EXCEL:XML',
  sourceFormats: ['EXCEL', 'XLS', 'XLSX'],
  targetFormat: 'XML',
  permissionCode: 'EXCEL_TO_XML',
  templateType: 'XML',
  defaultTemplateCode: 'accurate5-sales-invoice',
  inputMode: 'single',
  convert,
};
