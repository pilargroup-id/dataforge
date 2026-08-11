const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const TemplateRegistry = require('../../templates/template.registry');
const { sanitizeFileName, sanitizeReadableFileName } = require('../../utils/file.util');

function readWorkbook(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd', defval: '' });
  return { sheetName, rows, headers: rows.length ? Object.keys(rows[0]) : [] };
}

async function convert({ files, outputDir, batchName, templateCode, onValidated, onProgress }) {
  if (files.length !== 1) {
    const err = new Error('EXCEL_TO_PDF hanya menerima 1 file Excel per batch');
    err.code = 'INPUT_FILE_COUNT_INVALID';
    throw err;
  }

  const template = TemplateRegistry.resolve('PDF', templateCode);
  if (!template) {
    const err = new Error(`Template PDF tidak ditemukan: ${templateCode}`);
    err.code = 'TEMPLATE_NOT_FOUND';
    throw err;
  }

  const { rows, headers } = readWorkbook(files[0].path);
  if (!rows.length) {
    const err = new Error('File Excel kosong atau tidak memiliki data');
    err.code = 'EMPTY_INPUT';
    throw err;
  }

  const columns = template.resolveColumns(headers);
  if (onValidated) await onValidated({ headers, template_code: template.code });

  const groups = new Map();
  for (const row of rows) {
    const orderNo = String(row[columns.orderNo] ?? '').trim();
    if (!orderNo) continue;
    if (!groups.has(orderNo)) groups.set(orderNo, []);
    groups.get(orderNo).push(row);
  }

  if (!groups.size) {
    const err = new Error('Tidak ada data invoice yang dapat diproses');
    err.code = 'NO_INVOICE_DATA';
    throw err;
  }

  const outputFiles = [];
  const duplicateNames = new Map();
  let processed = 0;

  for (const [orderNo, groupRows] of groups.entries()) {
    const rawInvoiceNo = String(groupRows[0][columns.invoiceNo] || `INV-${processed + 1}`).trim();
    const safeInvoiceNo = sanitizeFileName(rawInvoiceNo, `INV-${processed + 1}`);
    const count = (duplicateNames.get(safeInvoiceNo) || 0) + 1;
    duplicateNames.set(safeInvoiceNo, count);
    const suffix = count > 1 ? `_${String(count).padStart(3, '0')}` : '';
    const pdfName = `${safeInvoiceNo}${suffix}.pdf`;
    const pdfPath = path.join(outputDir, pdfName);

    await template.createInvoicePdf({
      outputPath: pdfPath,
      rows: groupRows,
      orderNo,
      invoiceNo: rawInvoiceNo,
      columns,
    });

    processed += 1;
    outputFiles.push({
      file_name: pdfName,
      file_path: pdfPath,
      size_bytes: fs.statSync(pdfPath).size,
      records: 1,
      archive_name: `${sanitizeReadableFileName(batchName)}/${pdfName}`,
    });

    if (onProgress) {
      await onProgress({
        processedFiles: 1,
        totalFiles: 1,
        progressPercent: Math.round((processed / groups.size) * 100),
      });
    }
  }

  return {
    schema: { headers, template_code: template.code },
    files: outputFiles,
    totalRecords: groups.size,
  };
}

module.exports = {
  key: 'EXCEL:PDF',
  sourceFormats: ['EXCEL', 'XLS', 'XLSX'],
  targetFormat: 'PDF',
  permissionCode: 'EXCEL_TO_PDF',
  templateType: 'PDF',
  defaultTemplateCode: 'yose',
  inputMode: 'single',
  convert,
};
