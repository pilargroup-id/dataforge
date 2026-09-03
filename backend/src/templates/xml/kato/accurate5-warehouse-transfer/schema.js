const SOURCE_HEADERS = [
  'No. Transfer',
  'Tgl. Transfer',
  'Keterangan',
  'Gudang Asal (FROMWHID)',
  'Gudang Tujuan (TOWHID)',
  'Alamat Gudang Asal (opsional)',
  'Alamat Gudang Tujuan (opsional)',
  'Kode Barang (ITEMNO)',
  'Qty Transfer',
  'Satuan (ITEMUNIT)',
  'Rasio Satuan (UNITRATIO)',
  'Harga Satuan (UNITPRICE, opsional)',
];

const REQUIRED_HEADERS = [
  'No. Transfer',
  'Tgl. Transfer',
  'Gudang Asal (FROMWHID)',
  'Gudang Tujuan (TOWHID)',
  'Kode Barang (ITEMNO)',
  'Qty Transfer',
];

const FIELD_MAP = {
  TRANSFERNO: 'No. Transfer',
  TRANSFERDATE: 'Tgl. Transfer',
  DESCRIPTION: 'Keterangan',
  FROMWHID: 'Gudang Asal (FROMWHID)',
  TOWHID: 'Gudang Tujuan (TOWHID)',
  FROMWHADDRESS: 'Alamat Gudang Asal (opsional)',
  TOWHADDRESS: 'Alamat Gudang Tujuan (opsional)',

  ITEMNO: 'Kode Barang (ITEMNO)',
  QUANTITY: 'Qty Transfer',
  ITEMUNIT: 'Satuan (ITEMUNIT)',
  UNITRATIO: 'Rasio Satuan (UNITRATIO)',
  UNITPRICE: 'Harga Satuan (UNITPRICE, opsional)',
};

module.exports = {
  databaseCode: 'KATO',
  transactionCode: 'WAREHOUSE_TRANSFER',
  sheetName: 'Data Transfer Gudang',
  headerRow: 0,
  dataStartRow: 1,
  sourceHeaders: SOURCE_HEADERS,
  requiredHeaders: REQUIRED_HEADERS,
  fieldMap: FIELD_MAP,
  defaultBranchCode: '',
  defaults: {
    TRANSFERID: '',
    TRANSACTIONID: '',
    ITEMRESERVED1: '',
    ITEMRESERVED2: '',
    ITEMRESERVED3: '',
    ITEMRESERVED4: '',
    ITEMRESERVED5: '',
    ITEMRESERVED6: '',
    ITEMRESERVED7: '',
    ITEMRESERVED8: '',
    ITEMRESERVED9: '',
    ITEMRESERVED10: '',
    QTYCONTROL: '0',
  },
};
