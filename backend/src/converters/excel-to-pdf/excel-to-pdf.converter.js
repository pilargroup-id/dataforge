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

function buildPlannedGroups(groups) {
  const duplicateNames = new Map();
  const planned = [];
  let index = 0;

  for (const [orderNo, groupRows] of groups.entries()) {
    index += 1;
    const rawInvoiceNo = String(groupRows[0].__invoiceNo || `INV-${index}`).trim();
    const safeOrderNo = sanitizeFileName(orderNo, `ORDER-${index}`);
    const count = (duplicateNames.get(safeOrderNo) || 0) + 1;
    duplicateNames.set(safeOrderNo, count);
    const suffix = count > 1 ? `_${String(count).padStart(3, '0')}` : '';

    planned.push({
      index,
      orderNo,
      rawInvoiceNo,
      groupRows,
      pdfName: `${safeOrderNo}${suffix}.pdf`,
    });
  }

  return planned;
}

async function convert({
  files,
  outputDir,
  batchName,
  templateCode,
  onValidated,
  onProgress,
  onOutput,
  resumeState = null,
  existingOutputs = [],
}) {
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
  const groups = new Map();

  for (const row of rows) {
    const orderNo = String(row[columns.orderNo] ?? '').trim();
    if (!orderNo) continue;
    row.__invoiceNo = String(row[columns.invoiceNo] || '').trim();
    if (!groups.has(orderNo)) groups.set(orderNo, []);
    groups.get(orderNo).push(row);
  }

  if (!groups.size) {
    const err = new Error('Tidak ada data invoice yang dapat diproses');
    err.code = 'NO_INVOICE_DATA';
    throw err;
  }

  const plannedGroups = buildPlannedGroups(groups);
  const totalRecords = plannedGroups.length;

  if (onValidated) {
    await onValidated({
      headers,
      template_code: template.code,
      total_records: totalRecords,
    });
  }

  const existingByName = new Map(existingOutputs.map((file) => [file.file_name, file]));
  const outputFiles = [];
  const lastCompletedIndex = Math.max(0, Number(resumeState?.last_completed_index || 0));
  let processed = 0;

  for (const planned of plannedGroups) {
    const { index, orderNo, rawInvoiceNo, groupRows, pdfName } = planned;
    const pdfPath = path.join(outputDir, pdfName);

    if (index <= lastCompletedIndex) {
      const existing = existingByName.get(pdfName);
      if (!existing || !fs.existsSync(existing.file_path || pdfPath)) {
        const err = new Error(`Checkpoint tidak konsisten. Output ${pdfName} tidak ditemukan.`);
        err.code = 'RESUME_CHECKPOINT_INVALID';
        throw err;
      }

      const existingPath = existing.file_path || pdfPath;
      outputFiles.push({
        file_name: pdfName,
        file_path: existingPath,
        size_bytes: existing.size_bytes || fs.statSync(existingPath).size,
        records: existing.records || 1,
        archive_name: `${sanitizeReadableFileName(batchName)}/${pdfName}`,
      });
      processed = index;
      continue;
    }

    await template.createInvoicePdf({
      outputPath: pdfPath,
      rows: groupRows,
      orderNo,
      invoiceNo: rawInvoiceNo || `INV-${index}`,
      columns,
    });

    const outputFile = {
      file_name: pdfName,
      file_path: pdfPath,
      size_bytes: fs.statSync(pdfPath).size,
      records: 1,
      archive_name: `${sanitizeReadableFileName(batchName)}/${pdfName}`,
    };

    outputFiles.push(outputFile);
    processed = index;

    if (onOutput) {
      await onOutput(outputFile);
    }

    if (onProgress) {
      await onProgress({
        processedFiles: 1,
        totalFiles: 1,
        processedRecords: processed,
        totalRecords,
        progressPercent: Math.round((processed / totalRecords) * 100),
        checkpointData: {
          last_completed_index: processed,
          last_completed_key: orderNo,
        },
      });
    }
  }

  return {
    schema: { headers, template_code: template.code },
    files: outputFiles,
    totalRecords,
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
  supportsPauseResume: true,
  convert,
};
