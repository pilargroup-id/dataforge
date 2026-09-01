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

function num(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const mapped = {};
  const source = {};

  schema.sourceHeaders.forEach((header) => {
    source[header] = getSourceValue(row, headerIndex, header);
  });

  Object.entries(schema.fieldMap).forEach(([targetField, sourceHeader]) => {
    mapped[targetField] = source[sourceHeader] ?? '';
  });

  mapped.INVOICEDATE = normalizeDate(mapped.INVOICEDATE);
  mapped.SHIPDATE = normalizeDate(mapped.SHIPDATE || mapped.INVOICEDATE);
  mapped.TAXDATE = normalizeDate(mapped.TAXDATE || mapped.INVOICEDATE);
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

// Compatibility name for the existing Excel->XML converter.
// IMPORTANT: this function intentionally DOES NOT group equal invoice numbers.
// One source row always becomes one SALESINVOICE with one ITEMLINE.
function groupInvoices(rows) {
  const invoices = [];
  const errors = [];

  rows.forEach((row) => {
    const rowNumber = row.__rowNumber || '-';

    if (!row.INVOICENO) {
      errors.push({ row: rowNumber, level: 'error', message: 'Accurate Inv. No. kosong' });
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

    if (!row.CUSTOMERID) {
      errors.push({ row: rowNumber, level: 'warn', message: 'Customer ID kosong' });
    }
    if (!row.INVOICEDATE) {
      errors.push({ row: rowNumber, level: 'warn', message: 'Tgl Faktur kosong' });
    }

    invoices.push({
      INVOICENO: row.INVOICENO,
      header: row,
      items: [row],
      source_row_number: rowNumber,
      checkpoint_key: `${row.INVOICENO || 'NO-INVOICE'}#ROW-${rowNumber}`,
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
  const unitPrice = num(item.UNITPRICE, 0);
  let out = '<ITEMLINE operation="Add">';
  out += tag('KeyID', item.KEYID || 1);
  out += tag('ITEMNO', item.ITEMNO);
  out += tag('QUANTITY', num(item.QUANTITY, 0));
  out += tag('ITEMUNIT', item.ITEMUNIT);
  out += tag('UNITRATIO', num(item.UNITRATIO, 1));
  for (let i = 1; i <= 10; i += 1) out += `<ITEMRESERVED${i}/>`;
  out += tag('ITEMOVDESC', item.ITEMOVDESC);
  out += tag('UNITPRICE', unitPrice);
  out += tag('ITEMDISCPC', item.ITEMDISCPC);
  out += tag('TAXCODES', item.TAXCODES);
  out += '<GROUPSEQ/>';
  out += tag('SOSEQ', 0);
  out += tag('BRUTOUNITPRICE', unitPrice);
  out += tag('WAREHOUSEID', item.WAREHOUSEID_ITEM || item.WAREHOUSEID);
  out += tag('QTYCONTROL', 0);
  out += item.DOID ? tag('DOSEQ', 1) : '<DOSEQ/>';
  out += tag('SOID', item.SOID);
  out += tag('DOID', item.DOID);
  out += '</ITEMLINE>';
  return out;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  const item = invoice.items[0];
  let out = `<SALESINVOICE operation="Add" REQUESTID="${requestId}">`;

  // Final KATO SI rule: exactly one ITEMLINE per source row/invoice block.
  out += buildItemLineXml(item);

  out += tag('INVOICENO', h.INVOICENO);
  out += tag('INVOICEDATE', h.INVOICEDATE);
  out += tag('TAX1CODE', h.TAX1CODE);
  out += tag('TAX2CODE', h.TAX2CODE);
  out += tag('TAX1RATE', num(h.TAX1RATE, 0));
  out += tag('TAX2RATE', num(h.TAX2RATE, 0));
  out += tag('RATE', num(h.RATE, 1));
  out += tag('INCLUSIVETAX', num(h.INCLUSIVETAX, 0));
  out += tag('CUSTOMERISTAXABLE', num(h.CUSTOMERISTAXABLE, 0));
  out += tag('CASHDISCOUNT', num(h.CASHDISCOUNT, 0));
  out += tag('CASHDISCPC', h.CASHDISCPC);
  out += tag('FREIGHT', num(h.FREIGHT, 0));
  out += tag('TERMSID', h.TERMSID);
  out += tag('SHIPVIA', h.SHIPVIA);
  out += '<FOB/>';
  out += tag('PURCHASEORDERNO', h.PURCHASEORDERNO);
  out += tag('WAREHOUSEID', h.WAREHOUSEID);
  out += tag('DESCRIPTION', h.DESCRIPTION);
  out += tag('SHIPDATE', h.SHIPDATE || h.INVOICEDATE);
  out += tag('DELIVERYORDER', h.DELIVERYORDER);
  out += tag('FISCALRATE', num(h.FISCALRATE, 1));
  out += tag('TAXDATE', h.TAXDATE || h.INVOICEDATE);
  out += tag('CUSTOMERID', h.CUSTOMERID);
  out += `<SALESMANID><LASTNAME></LASTNAME>${tag('FIRSTNAME', h.SALESMANID)}</SALESMANID>`;
  out += tag('PRINTED', 0);
  out += tag('SHIPTO1', h.SHIPTO1);
  out += tag('SHIPTO2', h.SHIPTO2);
  out += tag('SHIPTO3', h.SHIPTO3);
  out += tag('SHIPTO4', h.SHIPTO4);
  out += tag('SHIPTO5', h.SHIPTO5);
  out += tag('ARACCOUNT', h.ARACCOUNT);
  out += tag('TAXFORMNUMBER', h.TAXFORMNUMBER);
  out += tag('TAXFORMCODE', h.TAXFORMCODE);
  out += tag('CURRENCYNAME', h.CURRENCYNAME);
  out += '<AUTOMATICINSERTGROUPING/>';
  out += '</SALESINVOICE>';
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
