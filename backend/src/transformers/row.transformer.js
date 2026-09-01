const { cleanHeader } = require('./header.transformer');
const { convertToStandardDate } = require('./date.transformer');
const { parseCurrencyToFloat } = require('./currency.transformer');
const { parseBooleanValue } = require('./boolean.transformer');

// Columns that must always stay STRING in the output JSONL, per the
// destination BigQuery table schema, even when the source cell holds a
// pure-digit value that xlsx/currency parsing would otherwise turn into a
// number (e.g. resi/product ids typed without a text format).
const FORCE_STRING_FIELDS = new Set([
  'nomor_pesanan',
  'jenis_paket',
  'status_pesanan',
  'status_marketplace',
  'marketplace',
  'toko_marketplace',
  'nama_panggilan_toko_bigseller',
  'provinsi',
  'kabupaten_kota',
  'kecamatan',
  'product_id',
  'sku',
  'sku_gudang',
  'nama_produk',
  'nama_variasi',
  'nama_sku_gudang',
  'kategori_tingkat_pertama',
  'kategori_tingkat_kedua',
  'kategori_tingkat_ketiga',
  'tautan_gambar',
  'dialokasikan_kurangi',
  'gudang_asal',
  'jasa_kirim_yang_dipilih_pembeli',
  'metode_pengiriman',
  'nomor_resi',
  'metode_pembayaran',
  'yang_membatalkan',
  'alasan_pembatalan',
]);

function processRowData(row) {
  const processed = {};

  for (const [key, rawValue] of Object.entries(row)) {
    const cleanKey = cleanHeader(key);
    let value = rawValue;

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      processed[cleanKey] = null;
      continue;
    }

    if (typeof value === 'string' && ['--', '—', '−'].includes(value.trim())) {
      processed[cleanKey] = null;
      continue;
    }

    if (FORCE_STRING_FIELDS.has(cleanKey)) {
      processed[cleanKey] = String(value);
      continue;
    }

    const currency = parseCurrencyToFloat(value);
    if (currency !== value) {
      processed[cleanKey] = currency;
      continue;
    }

    const boolean = parseBooleanValue(value);
    if (boolean !== value) {
      processed[cleanKey] = boolean;
      continue;
    }

    value = convertToStandardDate(value);
    processed[cleanKey] = value;
  }

  return processed;
}

module.exports = { processRowData };
