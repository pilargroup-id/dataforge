const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const COMPANY = {
  name: 'PT PILAR NIAGA MAKMUR',
  address: [
    'Ruko Duta Garden, Komplek No.08-09 Blok B4, Jurumudi Baru',
    'Kec. Benda, Kota Tangerang, Banten 15124',
  ],
  npwp: '76.651.638.9-402.000',
};

const LOGO_PATH = path.join(__dirname, 'assets', 'logo.jpeg');

function safeString(value, fallback = '-') {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return String(value).trim();
}

function safeNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  const raw = String(value).trim();
  if (!raw || ['-', '–', 'nan', 'none'].includes(raw.toLowerCase())) return fallback;

  let normalized = raw.replace(/Rp|IDR/gi, '').replace(/\s/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeInt(value, fallback = 1) {
  const parsed = Math.trunc(safeNumber(value, fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rupiah(value) {
  return `Rp ${Math.round(safeNumber(value, 0)).toLocaleString('id-ID')}`;
}

function formatDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(value);
  }
  return safeString(value);
}

function first(row, columns, fallback = null) {
  for (const column of columns) {
    if (!column) continue;
    const value = row[column];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function writeLabelValue(doc, label, value, x, y, width) {
  doc.font('Helvetica').fontSize(7).fillColor('#6B7280').text(label.toUpperCase(), x, y, { width });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(safeString(value), x, y + 11, { width });
}

function drawHeader(doc, invoiceNo, printTime) {
  const left = 42;
  const top = 42;

  if (fs.existsSync(LOGO_PATH)) {
    try { doc.image(LOGO_PATH, left, top, { fit: [75, 75] }); } catch (_) { /* optional asset */ }
  }

  const companyX = fs.existsSync(LOGO_PATH) ? 125 : left;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text(COMPANY.name, companyX, top + 4);
  doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563')
    .text(COMPANY.address[0], companyX, top + 23)
    .text(COMPANY.address[1], companyX, top + 34)
    .text(`NPWP: ${COMPANY.npwp}`, companyX, top + 45);

  doc.font('Helvetica-Bold').fontSize(23).fillColor('#111827').text('INVOICE', 360, top, { width: 190, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor('#4B5563')
    .text(`No Invoice: ${safeString(invoiceNo)}`, 360, top + 35, { width: 190, align: 'right' })
    .text(`Tanggal Cetak: ${formatDate(printTime)}`, 360, top + 48, { width: 190, align: 'right' });

  doc.moveTo(left, 112).lineTo(553, 112).strokeColor('#D1D5DB').lineWidth(0.8).stroke();
}

function drawTableHeader(doc, y) {
  const x = 42;
  const widths = [26, 78, 185, 70, 35, 55, 72];
  const labels = ['No', 'SKU', 'Nama Produk', 'Harga Satuan', 'Qty', 'Diskon', 'Subtotal'];
  doc.rect(x, y, widths.reduce((a, b) => a + b, 0), 24).fill('#F3F4F6');
  let cx = x;
  labels.forEach((label, index) => {
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#111827')
      .text(label, cx + 3, y + 8, { width: widths[index] - 6, align: index === 2 ? 'left' : 'center' });
    cx += widths[index];
  });
  return { y: y + 24, widths };
}

function ensureTableSpace(doc, y, invoiceNo, printTime) {
  if (y <= 720) return y;
  doc.addPage();
  drawHeader(doc, invoiceNo, printTime);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#6B7280').text('DETAIL PRODUK (LANJUTAN)', 42, 132);
  return drawTableHeader(doc, 148).y;
}

function createInvoicePdf({ outputPath, rows, orderNo, invoiceNo, columns }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, autoFirstPage: true });
    const output = fs.createWriteStream(outputPath);
    doc.pipe(output);
    output.on('finish', resolve);
    output.on('error', reject);
    doc.on('error', reject);

    const row0 = rows[0];
    const printTime = first(row0, [columns.printTime], '-');
    const warehouse = first(row0, [columns.warehouse], '-');
    const storeName = first(row0, [columns.storeName], '-');

    let productSubtotal = 0;
    if (columns.summarySubtotalProduct) {
      productSubtotal = safeNumber(row0[columns.summarySubtotalProduct], 0);
    } else if (columns.lineSubtotal) {
      productSubtotal = rows.reduce((sum, row) => sum + safeNumber(row[columns.lineSubtotal], 0), 0);
    }

    const shipping = safeNumber(first(row0, [columns.shipping], 0));
    const voucher = safeNumber(first(row0, [columns.voucher], 0));
    const tax = columns.tax ? rows.reduce((sum, row) => sum + safeNumber(row[columns.tax], 0), 0) : 0;
    let totalPayment = safeNumber(first(row0, [columns.totalPayment], 0));
    if (totalPayment <= 0) totalPayment = productSubtotal + shipping + tax - voucher;
    const detailFooterSubtotal = columns.detailFooterSubtotal
      ? safeNumber(row0[columns.detailFooterSubtotal], productSubtotal)
      : productSubtotal;

    drawHeader(doc, invoiceNo, printTime);

    doc.roundedRect(42, 128, 511, 55, 4).strokeColor('#E5E7EB').lineWidth(0.6).stroke();
    writeLabelValue(doc, 'No Pesanan', orderNo, 54, 141, 145);
    writeLabelValue(doc, 'No Invoice', invoiceNo, 212, 141, 145);
    writeLabelValue(doc, 'Warehouse', warehouse, 370, 141, 165);

    doc.roundedRect(42, 194, 511, 45, 4).strokeColor('#E5E7EB').stroke();
    writeLabelValue(doc, 'Nama Toko', storeName, 54, 205, 470);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#6B7280').text('DETAIL PRODUK', 42, 256);
    let table = drawTableHeader(doc, 272);
    let y = table.y;
    const widths = table.widths;

    rows.forEach((row, index) => {
      y = ensureTableSpace(doc, y, invoiceNo, printTime);

      const sku = safeString(first(row, [columns.skuParent, columns.sku], '-'));
      const name = safeString(first(row, [columns.productName], '-'));
      const price = safeNumber(first(row, [columns.unitPrice], 0));
      const qty = safeInt(first(row, [columns.qty], 1));
      const discount = safeNumber(first(row, [columns.discount], 0));
      let subtotal = safeNumber(first(row, [columns.lineSubtotal], 0));
      if (subtotal <= 0 && price > 0 && qty > 0) subtotal = price * qty - discount;

      const values = [String(index + 1), sku, name, rupiah(price), String(qty), discount > 0 ? rupiah(discount) : '–', rupiah(subtotal)];
      let cx = 42;
      const rowHeight = Math.max(30, doc.heightOfString(name, { width: widths[2] - 8 }) + 10);
      if (index % 2 === 1) doc.rect(42, y, widths.reduce((a, b) => a + b, 0), rowHeight).fill('#F9FAFB');
      values.forEach((value, colIndex) => {
        doc.font(colIndex === 6 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor('#111827')
          .text(value, cx + 4, y + 8, { width: widths[colIndex] - 8, align: colIndex === 2 ? 'left' : (colIndex >= 3 ? 'right' : 'center') });
        cx += widths[colIndex];
      });
      doc.moveTo(42, y + rowHeight).lineTo(553, y + rowHeight).strokeColor('#E5E7EB').lineWidth(0.3).stroke();
      y += rowHeight;
    });

    y = ensureTableSpace(doc, y + 8, invoiceNo, printTime);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text('Subtotal', 420, y, { width: 55, align: 'right' });
    doc.text(rupiah(detailFooterSubtotal), 480, y, { width: 73, align: 'right' });
    y += 30;

    if (y > 620) { doc.addPage(); drawHeader(doc, invoiceNo, printTime); y = 145; }
    const summaryX = 330;
    const summaryW = 223;
    const summary = [
      ['Subtotal Produk', rupiah(productSubtotal)],
      ['Ongkos Kirim', rupiah(shipping)],
    ];
    if (tax > 0) summary.push(['Pajak', rupiah(tax)]);
    if (voucher > 0) summary.push(['Voucher / Diskon', `- ${rupiah(voucher)}`]);
    summary.push(['Total Pembayaran', rupiah(totalPayment)]);

    summary.forEach(([label, value], idx) => {
      const isLast = idx === summary.length - 1;
      const h = isLast ? 34 : 26;
      if (isLast) doc.rect(summaryX, y, summaryW, h).fill('#F3F4F6');
      doc.font(isLast ? 'Helvetica-Bold' : 'Helvetica').fontSize(isLast ? 10 : 8).fillColor('#111827')
        .text(label, summaryX + 10, y + (isLast ? 11 : 9), { width: 105 });
      doc.font('Helvetica-Bold').fontSize(isLast ? 11 : 8.5)
        .text(value, summaryX + 115, y + (isLast ? 10 : 9), { width: 98, align: 'right' });
      doc.moveTo(summaryX, y + h).lineTo(summaryX + summaryW, y + h).strokeColor('#E5E7EB').lineWidth(0.3).stroke();
      y += h;
    });

    y += 24;
    if (y > 725) { doc.addPage(); drawHeader(doc, invoiceNo, printTime); y = 150; }
    doc.roundedRect(42, y, 511, 42, 4).fillAndStroke('#F9FAFB', '#E5E7EB');
    doc.font('Helvetica').fontSize(7.5).fillColor('#4B5563').text(
      'Dokumen ini diterbitkan secara otomatis dan merupakan bukti transaksi yang sah. Harap simpan untuk keperluan administrasi dan rekonsiliasi pembayaran.',
      54, y + 12, { width: 487 }
    );

    doc.end();
  });
}

module.exports = { createInvoicePdf };
