const XLSX = require('xlsx');
const path = require('path');
const { cleanHeader } = require('../transformers/header.transformer');

function createValidationError(message, details) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'SCHEMA_VALIDATION_FAILED';
  err.validationErrors = details;
  return err;
}

function inspectHeaders(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { sheetName: null, headers: [], normalizedHeaders: [], duplicates: [], emptyHeaders: [] };
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
  const headers = Array.isArray(rows[0]) ? rows[0].map((value) => String(value ?? '')) : [];
  const normalizedHeaders = headers.map(cleanHeader);
  const seen = new Set();
  const duplicates = [];
  const emptyHeaders = [];

  normalizedHeaders.forEach((header, index) => {
    if (!header) emptyHeaders.push({ index, original: headers[index] });
    if (header && seen.has(header)) duplicates.push(header);
    seen.add(header);
  });

  return {
    sheetName,
    headers,
    normalizedHeaders,
    duplicates: [...new Set(duplicates)],
    emptyHeaders,
  };
}

function diffHeaders(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing_headers: expected.filter((header) => !actualSet.has(header)),
    unexpected_headers: actual.filter((header) => !expectedSet.has(header)),
    order_matches: expected.length === actual.length && expected.every((header, index) => header === actual[index]),
  };
}

function validateSameSchema(files) {
  if (!files.length) throw createValidationError('No Excel files were provided', []);

  const inspected = files.map((file) => ({
    file_name: file.originalname || path.basename(file.path),
    path: file.path,
    ...inspectHeaders(file.path),
  }));

  const invalidOwnHeaders = inspected.filter(
    (file) => !file.normalizedHeaders.length || file.duplicates.length || file.emptyHeaders.length
  );

  if (invalidOwnHeaders.length) {
    throw createValidationError(
      'One or more files contain invalid headers',
      invalidOwnHeaders.map((file) => ({
        file_name: file.file_name,
        duplicate_headers: file.duplicates,
        empty_headers: file.emptyHeaders,
      }))
    );
  }

  const reference = inspected[0];
  const mismatches = [];

  for (const current of inspected.slice(1)) {
    const diff = diffHeaders(reference.normalizedHeaders, current.normalizedHeaders);
    if (!diff.order_matches) {
      mismatches.push({
        file_name: current.file_name,
        expected_headers: reference.normalizedHeaders,
        actual_headers: current.normalizedHeaders,
        ...diff,
      });
    }
  }

  if (mismatches.length) {
    throw createValidationError(
      'Batch rejected because one or more files have different column structures',
      {
        reference_file: reference.file_name,
        invalid_files: mismatches,
      }
    );
  }

  return {
    reference_file: reference.file_name,
    headers: reference.normalizedHeaders,
    files: inspected.map((item) => ({ file_name: item.file_name, sheet_name: item.sheetName })),
  };
}

module.exports = { validateSameSchema, inspectHeaders };
