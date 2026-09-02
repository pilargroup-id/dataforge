function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).trim();
}

function normalizeDate(value) {
  const text = cellToString(value);
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, day, month, year] = slash;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const dash = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const [, day, month, year] = dash;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return text;
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[char]));
}

function tag(name, value) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text === '' ? `<${name}/>` : `<${name}>${escapeXml(text)}</${name}>`;
}

function findHeaderRow(rawRows, schema) {
  const required = new Set((schema.requiredHeaders || []).map(normalizeHeader));
  let bestIndex = -1;
  let bestMatches = -1;

  rawRows.forEach((row, rowIndex) => {
    const headers = new Set(row.map(normalizeHeader).filter(Boolean));
    const matches = [...required].filter((header) => headers.has(header)).length;
    if (matches > bestMatches) {
      bestMatches = matches;
      bestIndex = rowIndex;
    }
  });

  if (bestMatches > 0) return bestIndex;

  const preferred = Number.isInteger(schema.headerRow) ? schema.headerRow : 0;
  if (rawRows[preferred]?.some((cell) => cellToString(cell) !== '')) return preferred;
  return rawRows.findIndex((row) => row.some((cell) => cellToString(cell) !== ''));
}

function buildHeaderIndex(headerRow) {
  const index = new Map();
  headerRow.forEach((value, columnIndex) => {
    const key = normalizeHeader(value);
    if (key && !index.has(key)) index.set(key, columnIndex);
  });
  return index;
}

function getSourceValue(row, headerIndex, sourceHeader) {
  const index = headerIndex.get(normalizeHeader(sourceHeader));
  return index === undefined ? '' : cellToString(row[index]);
}

function mapFinanceRow(row, headerIndex, schema, rowNumber) {
  const mapped = { ...(schema.defaults || {}) };
  const source = {};

  schema.sourceHeaders.forEach((header) => {
    source[header] = getSourceValue(row, headerIndex, header);
  });

  Object.entries(schema.fieldMap).forEach(([targetField, sourceHeader]) => {
    mapped[targetField] = source[sourceHeader] ?? '';
  });

  mapped.INVOICEDATE = normalizeDate(mapped.INVOICEDATE);
  mapped.__source = source;
  mapped.__rowNumber = rowNumber;
  return mapped;
}

function parseRows(rawRows, schema) {
  if (!Array.isArray(rawRows) || !rawRows.length) return [];

  const headerRowIndex = findHeaderRow(rawRows, schema);
  if (headerRowIndex < 0) {
    const err = new Error('File Excel tidak memiliki header');
    err.code = 'XML_SOURCE_HEADER_NOT_FOUND';
    throw err;
  }

  const headerIndex = buildHeaderIndex(rawRows[headerRowIndex]);
  const missingHeaders = (schema.requiredHeaders || []).filter(
    (header) => !headerIndex.has(normalizeHeader(header))
  );

  if (missingHeaders.length) {
    const err = new Error(`Header Finance tidak lengkap: ${missingHeaders.join(', ')}`);
    err.code = 'XML_SOURCE_HEADER_MISMATCH';
    err.errors = { missing_headers: missingHeaders };
    throw err;
  }

  const dataStartIndex = Math.max(headerRowIndex + 1, schema.dataStartRow || 1);
  return rawRows
    .slice(dataStartIndex)
    .map((row, index) => ({ row, rowNumber: dataStartIndex + index + 1 }))
    .filter(({ row }) => row.some((cell) => cellToString(cell) !== ''))
    .map(({ row, rowNumber }) => mapFinanceRow(row, headerIndex, schema, rowNumber));
}

// Compatibility function name for the existing generic Excel->XML converter.
// KATO Sales Return intentionally does not group duplicate return numbers.
// One source row always becomes one SALESRETURN with one ITEMLINE.
function groupInvoices(rows) {
  const invoices = [];
  const errors = [];

  rows.forEach((row) => {
    const rowNumber = row.__rowNumber || '-';

    if (!row.INVOICENO) {
      errors.push({ row: rowNumber, level: 'error', message: 'No. Faktur / No. Retur kosong' });
    }
    if (!row.SALESINVOICEID) {
      errors.push({ row: rowNumber, level: 'error', message: 'No. Invoice Asal kosong' });
    }
    if (!row.ITEMNO) {
      errors.push({ row: rowNumber, level: 'error', message: 'Kode Barang kosong' });
    }
    if (row.QUANTITY === '' || !Number.isFinite(Number(row.QUANTITY))) {
      errors.push({ row: rowNumber, level: 'error', message: 'QUANTITY tidak valid' });
    }
    if (row.UNITPRICE === '' || !Number.isFinite(Number(row.UNITPRICE))) {
      errors.push({ row: rowNumber, level: 'error', message: 'UNIT PRICE tidak valid' });
    }
    if (row.BRUTTOUNITPRICE === '' || !Number.isFinite(Number(row.BRUTTOUNITPRICE))) {
      errors.push({ row: rowNumber, level: 'error', message: 'Harga Setelah PPN tidak valid' });
    }

    if (!row.CUSTOMERID) {
      errors.push({ row: rowNumber, level: 'warn', message: 'Customer ID kosong' });
    }
    if (!row.INVOICEDATE) {
      errors.push({ row: rowNumber, level: 'warn', message: 'Tgl Faktur kosong' });
    }
    if (!row.WAREHOUSEID) {
      errors.push({ row: rowNumber, level: 'warn', message: 'Location kosong' });
    }

    invoices.push({
      INVOICENO: row.INVOICENO,
      header: row,
      items: [row],
      source_row_number: rowNumber,
      checkpoint_key: `${row.INVOICENO || 'NO-RETURN'}#ROW-${rowNumber}`,
    });
  });

  return { invoices, errors };
}

function buildXmlHeader(branchCode) {
  const normalizedBranchCode = normalizeWhitespace(branchCode);
  if (!normalizedBranchCode) {
    const err = new Error('branch_code is required for KATO Accurate 5 XML conversion');
    err.code = 'BRANCH_CODE_REQUIRED';
    throw err;
  }

  return `<?xml version="1.0"?>\n<NMEXML EximID="1" BranchCode="${escapeXml(normalizedBranchCode)}" ACCOUNTANTCOPYID=""><TRANSACTIONS OnError="CONTINUE">`;
}

function buildItemLineXml(item) {
  let out = '<ITEMLINE operation="Add">';
  out += tag('INVOICESEQ', item.INVOICESEQ);
  out += tag('ITEMNO', item.ITEMNO);
  out += tag('ITEMOVDESC', item.ITEMOVDESC);
  out += tag('QUANTITY', item.QUANTITY);
  out += tag('ITEMUNIT', item.ITEMUNIT);
  out += tag('UNITRATIO', item.UNITRATIO);
  out += tag('UNITPRICE', item.UNITPRICE);
  out += tag('BRUTTOUNITPRICE', item.BRUTTOUNITPRICE);
  out += tag('ITEMDISCPC', item.ITEMDISCPC);
  out += tag('TAXCODES', item.TAXCODES);
  out += tag('WAREHOUSEID', item.WAREHOUSEID_ITEM || item.WAREHOUSEID);
  out += tag('INVID', item.INVID);
  out += tag('DOID', item.DOID_ITEM);
  out += '</ITEMLINE>';
  return out;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  const item = invoice.items[0];
  let out = `<SALESRETURN operation="Add" REQUESTID="${requestId}">`;

  // Final KATO return rule: exactly one ITEMLINE per source row/return block.
  out += buildItemLineXml(item);

  out += tag('INVOICENO', h.INVOICENO);
  out += tag('INVOICEDATE', h.INVOICEDATE);
  out += tag('CUSTOMERID', h.CUSTOMERID);
  out += tag('SALESINVOICEID', h.SALESINVOICEID);
  out += tag('DELIVERYORDERID', h.DELIVERYORDERID);
  out += tag('WAREHOUSEID', h.WAREHOUSEID);
  out += `<SALESMANID><LASTNAME></LASTNAME>${tag('FIRSTNAME', h.SALESMANID)}</SALESMANID>`;
  out += tag('DESCRIPTION', h.DESCRIPTION);
  out += tag('TAX1CODE', h.TAX1CODE);
  out += tag('TAX1RATE', h.TAX1RATE);
  out += tag('TAX2CODE', h.TAX2CODE);
  out += tag('TAX2RATE', h.TAX2RATE);
  out += tag('RATE', h.RATE);
  out += tag('INCLUSIVETAX', h.INCLUSIVETAX);
  out += tag('CUSTOMERISTAXABLE', h.CUSTOMERISTAXABLE);
  out += tag('CASHDISCOUNT', h.CASHDISCOUNT);
  out += tag('CASHDISCPC', h.CASHDISCPC);
  out += tag('CURRENCYNAME', h.CURRENCYNAME);
  out += tag('GLYEAR', h.GLYEAR);
  out += tag('GLPERIOD', h.GLPERIOD);
  out += '</SALESRETURN>';
  return out;
}

function buildXmlFooter() {
  return '</TRANSACTIONS></NMEXML>';
}

function buildXml(invoices, branchCode) {
  let out = buildXmlHeader(branchCode);
  invoices.forEach((invoice, index) => {
    out += buildInvoiceXml(invoice, index + 1);
  });
  out += buildXmlFooter();
  return out;
}

module.exports = {
  parseRows,
  groupInvoices,
  buildXml,
  buildXmlHeader,
  buildInvoiceXml,
  buildXmlFooter,
};
