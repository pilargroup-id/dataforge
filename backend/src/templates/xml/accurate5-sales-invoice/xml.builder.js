function cellToString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).trim();
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[char]));
}

function tag(name, value) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text === '' ? `<${name}/>` : `<${name}>${escapeXml(text)}</${name}>`;
}

function num(value, fallback) {
  const parsed = Number(value);
  return value === '' || !Number.isFinite(parsed) ? fallback : parsed;
}

function parseRows(rawRows, schema) {
  const dataRows = rawRows
    .slice(schema.dataStartRow)
    .filter((row) => row.some((cell) => cellToString(cell) !== ''));

  return dataRows.map((row) => {
    const item = {};
    schema.columns.forEach((column, index) => { item[column] = cellToString(row[index]); });
    return item;
  });
}

function groupInvoices(rows, dataStartRow) {
  const invoices = [];
  const errors = [];
  let current = null;

  rows.forEach((row, index) => {
    const rowNumber = index + dataStartRow + 1;
    if (!row.INVOICENO) {
      errors.push({ row: rowNumber, level: 'error', message: 'No. Invoice (kolom A) kosong' });
      return;
    }

    if (!current || current.INVOICENO !== row.INVOICENO) {
      current = { INVOICENO: row.INVOICENO, header: row, items: [] };
      invoices.push(current);
    }

    if (!row.ITEMNO) {
      errors.push({ row: rowNumber, level: 'error', message: `Invoice ${row.INVOICENO}: ITEMNO kosong` });
    } else {
      if (row.QUANTITY === '' || !Number.isFinite(Number(row.QUANTITY))) {
        errors.push({ row: rowNumber, level: 'error', message: `Invoice ${row.INVOICENO}, ${row.ITEMNO}: QUANTITY tidak valid` });
      }
      if (row.UNITPRICE === '' || !Number.isFinite(Number(row.UNITPRICE))) {
        errors.push({ row: rowNumber, level: 'error', message: `Invoice ${row.INVOICENO}, ${row.ITEMNO}: UNITPRICE tidak valid` });
      }
      current.items.push(row);
    }
  });

  invoices.forEach((invoice) => {
    if (!invoice.items.length) errors.push({ row: '-', level: 'error', message: `Invoice ${invoice.INVOICENO} tidak memiliki barang` });
  });

  return { invoices, errors };
}

function buildXmlStart(branchCode) {
  return `<?xml version="1.0"?>\n<NMEXML EximID="1" BranchCode="${escapeXml(branchCode)}" ACCOUNTANTCOPYID=""><TRANSACTIONS OnError="CONTINUE">`;
}

function buildInvoiceXml(invoice, requestId) {
  const h = invoice.header;
  let out = `<SALESINVOICE operation="Add" REQUESTID="${requestId}">`;

  invoice.items.forEach((item, itemIndex) => {
    const unitPrice = num(item.UNITPRICE, 0);
    out += '<ITEMLINE operation="Add">';
    out += tag('KeyID', itemIndex + 1);
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
    out += tag('WAREHOUSEID', item.WAREHOUSEID_ITEM || h.WAREHOUSEID);
    out += tag('QTYCONTROL', 0);
    out += item.DOID ? tag('DOSEQ', 1) : '<DOSEQ/>';
    out += tag('SOID', item.SOID);
    out += tag('DOID', item.DOID);
    out += '</ITEMLINE>';
  });

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
  out += tag('CURRENCYNAME', h.CURRENCYNAME || 'IDR');
  out += '<AUTOMATICINSERTGROUPING/>';
  out += '</SALESINVOICE>';

  return out;
}

function buildXmlEnd() {
  return '</TRANSACTIONS></NMEXML>';
}

function buildXml(invoices, branchCode) {
  let out = buildXmlStart(branchCode);
  invoices.forEach((invoice, index) => {
    out += buildInvoiceXml(invoice, index + 1);
  });
  out += buildXmlEnd();
  return out;
}

module.exports = {
  parseRows,
  groupInvoices,
  buildXmlStart,
  buildInvoiceXml,
  buildXmlEnd,
  buildXml,
};
