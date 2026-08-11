function normalizeColumnName(value) {
  return String(value || '').trim().toLowerCase();
}

function findColumn(headers, candidates, required = false) {
  const normalizedMap = new Map(headers.map((header) => [normalizeColumnName(header), header]));

  for (const candidate of candidates) {
    const found = normalizedMap.get(normalizeColumnName(candidate));
    if (found) return found;
  }

  if (required) {
    const err = new Error(`Kolom wajib tidak ditemukan. Gunakan salah satu: ${candidates.join(', ')}`);
    err.code = 'TEMPLATE_COLUMN_MISSING';
    throw err;
  }

  return null;
}

function excelColumnToIndex(letter) {
  let result = 0;
  for (const ch of String(letter).trim().toUpperCase()) {
    if (ch < 'A' || ch > 'Z') return -1;
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return result - 1;
}

function columnByLetter(headers, letter) {
  const index = excelColumnToIndex(letter);
  return index >= 0 && index < headers.length ? headers[index] : null;
}

function resolveColumns(headers) {
  const columns = {
    orderNo: findColumn(headers, ['No Pesanan', 'Nomor Pesanan', 'Order No', 'Nomor Order', 'No Order'], true),
    invoiceNo: findColumn(headers, ['No Invoice', 'Nomor Invoice', 'Invoice No', 'Nomor', 'No. Invoice'], true),
    printTime: findColumn(headers, ['Waktu Cetak Faktur', 'Tanggal Cetak', 'Tanggal Print']),
    warehouse: findColumn(headers, ['Warehouse', 'Gudang']),
    storeName: findColumn(headers, ['Nama Toko', 'Toko', 'Nama Pembeli', 'Nama Customer', 'Customer', 'Pembeli']),
    skuParent: findColumn(headers, ['SKU Induk', 'SKU Parent']),
    sku: findColumn(headers, ['SKU', 'Kode SKU', 'Kode Produk']),
    productName: findColumn(headers, ['Nama Produk', 'Produk', 'Product Name', 'Nama Barang']),
    unitPrice: findColumn(headers, ['Harga Setelah Diskon', 'Harga Satuan', 'Harga', 'Harga per Item']),
    qty: findColumn(headers, ['Jumlah', 'Qty', 'Quantity', 'Kuantitas']),
    discount: findColumn(headers, ['Total Diskon', 'Diskon', 'Jumlah Diskon']),
    lineSubtotal: findColumn(headers, ['Total Harga Produk', 'Jumlah subtotal per Item', 'Subtotal', 'Subtotal Produk', 'Total Produk']),
    shipping: findColumn(headers, ['Perkiraan Ongkos Kirim', 'Pengiriman', 'Ongkos Kirim', 'Biaya Kirim']),
    voucher: findColumn(headers, ['Voucher', 'Potongan Voucher', 'Diskon Voucher']),
    totalPayment: findColumn(headers, ['Total Pembayaran', 'Jumlah Pembayaran', 'Grand Total', 'Total Bayar']),
    tax: findColumn(headers, ['Pajak']),
    summarySubtotalProduct: null,
    detailFooterSubtotal: null,
  };

  // Preserve BillForge's special mapping for templates containing Pajak.
  if (columns.tax) {
    columns.unitPrice = columnByLetter(headers, 'Q') || columns.unitPrice;
    columns.lineSubtotal = columnByLetter(headers, 'R') || columns.lineSubtotal;
    columns.summarySubtotalProduct = columnByLetter(headers, 'T');
    columns.discount = columnByLetter(headers, 'U') || columns.discount;
    columns.totalPayment = columnByLetter(headers, 'Z') || columns.totalPayment;
    columns.detailFooterSubtotal = columnByLetter(headers, 'Z');
  }

  return columns;
}

module.exports = { resolveColumns };
