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

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 0 && serial < 2958466) {
      const excelEpochUtc = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpochUtc + Math.floor(serial) * 24 * 60 * 60 * 1000);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

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

function normalizeBinaryFlag(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 0 ? 0 : 1;

  const text = normalizeWhitespace(value).toLowerCase();
  if (['1', 'yes', 'y', 'ya', 'true'].includes(text)) return 1;
  if (['0', 'no', 'n', 'tidak', 'false'].includes(text)) return 0;
  return fallback;
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
  mapped.CUSTOMERISTAXABLE = normalizeBinaryFlag(mapped.CUSTOMERISTAXABLE, 0);
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

function sameValue(left, right) {
  return normalizeWhitespace(left) === normalizeWhitespace(right);
}

function validateGroupHeader(base, row, rowNumber, errors) {
  const checks = [
    ['INVOICEDATE', 'Tgl Faktur'],
    ['CUSTOMERID', 'Customer ID'],
    ['TERMSID', 'Term Transaction'],
    ['WAREHOUSEID', 'Location'],
    ['SALESMANID', 'Sales Name'],
    ['RATE', 'Exchange Rate'],
    ['FISCALRATE', 'Exchange Rate'],
    ['ARACCOUNT', 'AR Account'],
    ['CURRENCYNAME', 'Currency'],
    ['CUSTOMERISTAXABLE', 'Required E-Faktur'],
    ['DESCRIPTION', 'Memo Header'],
  ];

  checks.forEach(([field, label]) => {
    if (!sameValue(base[field], row[field])) {
      errors.push({
        row: rowNumber,
        level: 'warn',
        message: `${label} berbeda untuk Accurate Inv. No. ${base.INVOICENO}; header invoice memakai nilai dari row pertama`,
      });
    }
  });
}

function groupInvoices(rows) {
  const invoices = [];
  const errors = [];
  const byInvoiceNo = new Map();

  rows.forEach((row) => {
    const rowNumber = row.__rowNumber || '-';

    if (!row.INVOICENO) {
      errors.push({ row: rowNumber, level: 'error', message: 'Accurate Inv. No. kosong' });
      return;
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
      errors.push({ row: rowNumber, level: 'error', message: 'Customer ID kosong' });
    }
    if (!row.INVOICEDATE) {
      errors.push({ row: rowNumber, level: 'error', message: 'Tgl Faktur kosong' });
    }

    const existing = byInvoiceNo.get(row.INVOICENO);
    if (!existing) {
      const invoice = {
        INVOICENO: row.INVOICENO,
        header: row,
        items: [row],
        source_row_number: rowNumber,
        checkpoint_key: row.INVOICENO,
      };
      byInvoiceNo.set(row.INVOICENO, invoice);
      invoices.push(invoice);
      return;
    }

    validateGroupHeader(existing.header, row, rowNumber, errors);
    existing.items.push(row);
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

function buildItemLineXml(item, itemIndex) {
  const unitPrice = num(item.UNITPRICE, 0);
  let out = '<ITEMLINE operation="Add">';
  out += tag('KeyID', item.KEYID || itemIndex + 1);
  out += tag('ITEMNO', item.ITEMNO);
  out += tag('QUANTITY', num(item.QUANTITY, 0));
  out += tag('ITEMUNIT', item.ITEMUNIT);
  out += tag('UNITRATIO', 1);
  for (let i = 1; i <= 10; i += 1) out += `<ITEMRESERVED${i}/>`;
  out += tag('ITEMOVDESC', item.ITEMOVDESC);
  out += tag('UNITPRICE', unitPrice);
  out += '<ITEMDISCPC/>';
  out += tag('TAXCODES', 4);
  out += '<GROUPSEQ/>';
  out += tag('SOSEQ', 0);
  out += tag('BRUTOUNITPRICE', unitPrice);
  out += tag('WAREHOUSEID', item.WAREHOUSEID_ITEM || item.WAREHOUSEID);
  out += tag('QTYCONTROL', 0);
  out += '<DOSEQ/>';
  out += '<SOID/>';
  out += '<DOID/>';
  out += '</ITEMLINE>';
  return out;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  let out = `<SALESINVOICE operation="Add" REQUESTID="${requestId}">`;

  invoice.items.forEach((item, itemIndex) => {
    out += buildItemLineXml(item, itemIndex);
  });

  out += tag('INVOICENO', h.INVOICENO);
  out += tag('INVOICEDATE', h.INVOICEDATE);
  out += tag('TAX1CODE', 4);
  out += '<TAX2CODE/>';
  out += tag('TAX1RATE', 0);
  out += tag('TAX2RATE', 0);
  out += tag('RATE', num(h.RATE, 1));
  out += tag('INCLUSIVETAX', 1);
  out += tag('CUSTOMERISTAXABLE', 1);
  out += tag('CASHDISCOUNT', 0);
  out += '<CASHDISCPC/>';
  out += tag('FREIGHT', 0);
  out += tag('TERMSID', h.TERMSID);
  out += tag('SHIPVIA', 'EKSPEDISI OL');
  out += '<FOB/>';
  out += '<PURCHASEORDERNO/>';
  out += tag('WAREHOUSEID', h.WAREHOUSEID);
  out += tag('DESCRIPTION', h.DESCRIPTION);
  out += tag('SHIPDATE', h.SHIPDATE || h.INVOICEDATE);
  out += '<DELIVERYORDER/>';
  out += tag('FISCALRATE', num(h.FISCALRATE, 1));
  out += tag('TAXDATE', h.TAXDATE || h.INVOICEDATE);
  out += tag('CUSTOMERID', h.CUSTOMERID);
  out += `<SALESMANID><LASTNAME></LASTNAME>${tag('FIRSTNAME', h.SALESMANID)}</SALESMANID>`;
  out += tag('PRINTED', 0);
  out += '<SHIPTO1/>';
  out += '<SHIPTO2/>';
  out += '<SHIPTO3/>';
  out += '<SHIPTO4/>';
  out += '<SHIPTO5/>';
  out += tag('ARACCOUNT', h.ARACCOUNT);
  out += tag('TAXFORMNUMBER', h.TAXFORMNUMBER);
  out += '<TAXFORMCODE/>';
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
