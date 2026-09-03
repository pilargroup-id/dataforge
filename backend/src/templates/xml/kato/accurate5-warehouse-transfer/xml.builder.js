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

function mapSourceRow(row, headerIndex, schema, rowNumber) {
  const mapped = { ...(schema.defaults || {}) };
  const source = {};

  schema.sourceHeaders.forEach((header) => {
    source[header] = getSourceValue(row, headerIndex, header);
  });

  Object.entries(schema.fieldMap).forEach(([targetField, sourceHeader]) => {
    mapped[targetField] = source[sourceHeader] ?? '';
  });

  mapped.TRANSFERDATE = normalizeDate(mapped.TRANSFERDATE);
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
    const err = new Error(`Header Transfer Gudang tidak lengkap: ${missingHeaders.join(', ')}`);
    err.code = 'XML_SOURCE_HEADER_MISMATCH';
    err.errors = { missing_headers: missingHeaders };
    throw err;
  }

  const dataStartIndex = Math.max(headerRowIndex + 1, schema.dataStartRow || 1);
  return rawRows
    .slice(dataStartIndex)
    .map((row, index) => ({ row, rowNumber: dataStartIndex + index + 1 }))
    .filter(({ row }) => row.some((cell) => cellToString(cell) !== ''))
    .map(({ row, rowNumber }) => mapSourceRow(row, headerIndex, schema, rowNumber));
}

// Compatibility function name for the generic Excel->XML converter.
// KATO Warehouse Transfer groups source rows by No. Transfer / TRANSFERNO.
// Each row inside a transfer group becomes one WTRAN ITEMLINE.
function groupInvoices(rows) {
  const groups = new Map();
  const errors = [];

  rows.forEach((row) => {
    const rowNumber = row.__rowNumber || '-';
    const transferNumber = cellToString(row.TRANSFERNO);

    if (!transferNumber) {
      errors.push({ row: rowNumber, level: 'error', message: 'No. Transfer kosong' });
      return;
    }
    if (!row.TRANSFERDATE) {
      errors.push({ row: rowNumber, level: 'error', message: 'Tgl. Transfer kosong' });
    }
    if (!row.FROMWHID) {
      errors.push({ row: rowNumber, level: 'error', message: 'Gudang Asal (FROMWHID) kosong' });
    }
    if (!row.TOWHID) {
      errors.push({ row: rowNumber, level: 'error', message: 'Gudang Tujuan (TOWHID) kosong' });
    }
    if (!row.ITEMNO) {
      errors.push({ row: rowNumber, level: 'error', message: 'Kode Barang (ITEMNO) kosong' });
    }
    if (!row.QUANTITY) {
      errors.push({ row: rowNumber, level: 'error', message: 'Qty Transfer kosong' });
    }

    if (!groups.has(transferNumber)) {
      groups.set(transferNumber, {
        INVOICENO: transferNumber, // compatibility checkpoint key for generic converter
        TRANSFERNO: transferNumber,
        header: { ...row },
        itemLines: [],
        source_row_numbers: [],
        checkpoint_key: transferNumber,
      });
    }

    const group = groups.get(transferNumber);
    const h = group.header;

    const consistencyChecks = [
      ['Tgl. Transfer', 'TRANSFERDATE'],
      ['Keterangan', 'DESCRIPTION'],
      ['Gudang Asal (FROMWHID)', 'FROMWHID'],
      ['Gudang Tujuan (TOWHID)', 'TOWHID'],
      ['Alamat Gudang Asal', 'FROMWHADDRESS'],
      ['Alamat Gudang Tujuan', 'TOWHADDRESS'],
    ];

    consistencyChecks.forEach(([label, field]) => {
      if (cellToString(h[field]) !== cellToString(row[field])) {
        errors.push({
          row: rowNumber,
          level: 'error',
          message: `${label} berbeda dalam No. Transfer ${transferNumber}`,
        });
      }
    });

    group.itemLines.push({ ...row });
    group.source_row_numbers.push(rowNumber);
  });

  return { invoices: [...groups.values()], errors };
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

function buildItemLineXml(line, keyId) {
  let out = '<ITEMLINE operation="Add">';
  out += tag('KeyID', keyId);
  out += tag('ITEMNO', line.ITEMNO);
  out += tag('QUANTITY', line.QUANTITY);
  out += tag('ITEMUNIT', line.ITEMUNIT);
  out += tag('UNITRATIO', line.UNITRATIO);
  out += tag('ITEMRESERVED1', line.ITEMRESERVED1);
  out += tag('ITEMRESERVED2', line.ITEMRESERVED2);
  out += tag('ITEMRESERVED3', line.ITEMRESERVED3);
  out += tag('ITEMRESERVED4', line.ITEMRESERVED4);
  out += tag('ITEMRESERVED5', line.ITEMRESERVED5);
  out += tag('ITEMRESERVED6', line.ITEMRESERVED6);
  out += tag('ITEMRESERVED7', line.ITEMRESERVED7);
  out += tag('ITEMRESERVED8', line.ITEMRESERVED8);
  out += tag('ITEMRESERVED9', line.ITEMRESERVED9);
  out += tag('ITEMRESERVED10', line.ITEMRESERVED10);
  out += tag('UNITPRICE', line.UNITPRICE);
  out += tag('QTYCONTROL', line.QTYCONTROL);
  out += '</ITEMLINE>';
  return out;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  let out = `<WTRAN operation="Add" REQUESTID="${requestId}">`;

  out += tag('TRANSFERID', h.TRANSFERID);
  out += tag('TRANSACTIONID', h.TRANSACTIONID);
  out += tag('TRANSFERNO', h.TRANSFERNO);
  out += tag('TRANSFERDATE', h.TRANSFERDATE);
  out += tag('DESCRIPTION', h.DESCRIPTION);
  out += tag('FROMWHID', h.FROMWHID);
  out += tag('TOWHID', h.TOWHID);
  out += tag('FROMWHADDRESS', h.FROMWHADDRESS);
  out += tag('TOWHADDRESS', h.TOWHADDRESS);

  invoice.itemLines.forEach((line, index) => {
    out += buildItemLineXml(line, index + 1);
  });

  out += '</WTRAN>';
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
