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

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const text = cellToString(value);
  if (!text) return NaN;
  const normalized = text.replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function formatAmount(value) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Math.round((value + Number.EPSILON) * 1e10) / 1e10);
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

  mapped.PAYMENTDATE = normalizeDate(mapped.PAYMENTDATE);
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
// KATO Payment intentionally groups rows by No Pelunasan / SEQUENCENO.
// Each source row inside a group becomes one Accurate CustomerReceipt InvoiceLine.
function groupInvoices(rows) {
  const groups = new Map();
  const errors = [];

  rows.forEach((row) => {
    const rowNumber = row.__rowNumber || '-';
    const paymentNumber = cellToString(row.SEQUENCENO);

    if (!paymentNumber) {
      errors.push({ row: rowNumber, level: 'error', message: 'No Pelunasan kosong' });
      return;
    }
    if (!row.BILLTOID) {
      errors.push({ row: rowNumber, level: 'error', message: 'Customer ID kosong' });
    }
    if (!row.PAYMENTDATE) {
      errors.push({ row: rowNumber, level: 'error', message: 'TGL PELUNASAN kosong' });
    }
    if (!row.ARINVOICEID) {
      errors.push({ row: rowNumber, level: 'error', message: 'Sales Invoice kosong' });
    }

    const paymentAmount = parseAmount(row.PAYMENTAMOUNT);
    if (!Number.isFinite(paymentAmount)) {
      errors.push({ row: rowNumber, level: 'error', message: 'Jumlah Pelunasan1 tidak valid' });
    }

    const sourceChequeAmount = parseAmount(row.SOURCE_CHEQUEAMOUNT);
    if (!Number.isFinite(sourceChequeAmount)) {
      errors.push({ row: rowNumber, level: 'error', message: 'Jumlah Pelunasan tidak valid' });
    }

    if (!groups.has(paymentNumber)) {
      groups.set(paymentNumber, {
        INVOICENO: paymentNumber, // compatibility checkpoint key for generic converter
        SEQUENCENO: paymentNumber,
        header: { ...row },
        invoiceLines: [],
        chequeAmount: 0,
        source_row_numbers: [],
        checkpoint_key: paymentNumber,
      });
    }

    const group = groups.get(paymentNumber);
    const h = group.header;

    const consistencyChecks = [
      ['Customer ID', 'BILLTOID'],
      ['TGL PELUNASAN', 'PAYMENTDATE'],
      ['Currency', 'CURRENCYNAME'],
      ['Exchange Rate', 'RATE'],
    ];

    consistencyChecks.forEach(([label, field]) => {
      if (cellToString(h[field]) !== cellToString(row[field])) {
        errors.push({
          row: rowNumber,
          level: 'error',
          message: `${label} berbeda dalam No Pelunasan ${paymentNumber}`,
        });
      }
    });

    group.invoiceLines.push({
      ...row,
      PAYMENTAMOUNT: Number.isFinite(paymentAmount) ? formatAmount(paymentAmount) : row.PAYMENTAMOUNT,
    });
    group.chequeAmount += Number.isFinite(sourceChequeAmount) ? sourceChequeAmount : 0;
    group.source_row_numbers.push(rowNumber);
  });

  const invoices = [...groups.values()].map((group) => ({
    ...group,
    header: {
      ...group.header,
      CHEQUEAMOUNT: formatAmount(group.chequeAmount),
    },
  }));

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

function buildInvoiceLineXml(line, keyId) {
  let out = '<InvoiceLine operation="Add">';
  out += tag('KeyID', keyId);
  out += tag('PAYMENTAMOUNT', line.PAYMENTAMOUNT);
  out += tag('TAXPPH23', line.TAXPPH23);
  out += tag('PPH23AMOUNT', line.PPH23AMOUNT);
  out += tag('PPH23RATE', line.PPH23RATE);
  out += tag('PPH23FISCALRATE', line.PPH23FISCALRATE);
  out += tag('PPH23NUMBER', line.PPH23NUMBER);
  out += tag('DISCTAKENAMOUNT', line.DISCTAKENAMOUNT);
  out += tag('ARINVOICEID', line.ARINVOICEID);
  out += '</InvoiceLine>';
  return out;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  let out = `<CUSTOMERRECEIPT operation="Add" REQUESTID="${requestId}">`;

  invoice.invoiceLines.forEach((line, index) => {
    out += buildInvoiceLineXml(line, index + 1);
  });

  out += tag('SEQUENCENO', h.SEQUENCENO);
  out += tag('PAYMENTDATE', h.PAYMENTDATE);
  out += tag('CHEQUENO', h.CHEQUENO);
  out += tag('BANKACCOUNT', h.BANKACCOUNT);
  out += tag('CHEQUEDATE', h.CHEQUEDATE);
  out += tag('CHEQUEAMOUNT', h.CHEQUEAMOUNT);
  out += tag('RATE', h.RATE);
  out += tag('DESCRIPTION', h.DESCRIPTION);
  out += tag('FISCALPMT', h.FISCALPMT);
  out += tag('VOID', h.VOID);
  out += tag('BILLTOID', h.BILLTOID);
  out += tag('OVERPAYUSED', h.OVERPAYUSED);
  out += tag('APPLYFROMCREDIT', h.APPLYFROMCREDIT);
  out += tag('CURRENCYNAME', h.CURRENCYNAME);
  out += tag('RETURNCREDIT', h.RETURNCREDIT);
  out += '</CUSTOMERRECEIPT>';
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
  buildXmlHeader,
  buildInvoiceXml,
  buildXmlFooter,
  buildXml,
};
