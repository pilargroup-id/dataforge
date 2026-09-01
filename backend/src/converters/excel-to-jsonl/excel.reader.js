const XLSX = require('xlsx');

function readRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { sheetName: null, rows: [] };

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd',
    cellDates: true,
    defval: null,
  });

  // xlsx can still hand back a native number for cells stored as the
  // Excel "Number" type even with raw:false (e.g. resi numbers typed
  // without a text format). Downstream code expects consistently
  // stringified values so the correct type gets re-applied explicitly
  // by row.transformer.js (currency/boolean/date), and so values that
  // should stay text-like (e.g. STRING columns in BigQuery) don't leak
  // out as JSON numbers.
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (typeof row[key] === 'number') {
        row[key] = String(row[key]);
      }
    }
  }

  return { sheetName, rows };
}

module.exports = { readRows };
