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

  return { sheetName, rows };
}

module.exports = { readRows };
