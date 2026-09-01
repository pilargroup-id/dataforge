# Dataforge FE Consume - KATO Accurate 5 Sales Invoice

## Scope UI

Submodule tetap:

```text
CONVERT / EXCEL_TO_XML
```

Template pertama dalam namespace database KATO:

```text
KATO
└── Accurate 5 - Sales Invoice
```

Backend template code tetap:

```text
accurate5-sales-invoice
```

---

## Recommended UI

```text
Convert

Source Format
Excel

Target Format
XML

Database / Mapping
KATO

Transaction
Sales Invoice

BranchCode
[________________]

File
[ finance-si.xlsx ]

[ Convert ]
```

Untuk versi ini database/mapping hanya `KATO` dan transaction hanya `Sales Invoice`, tetapi UI sebaiknya sudah disusun sebagai dua konsep terpisah agar nanti dapat ditambah Payment, Return, Warehouse Transfer, Item Bundling, atau database Accurate lain.

---

## Request

Endpoint:

```http
POST /api/conversions/EXCEL/XML
```

`multipart/form-data`:

```text
files         = <1 file .xlsx/.xls>
template_code = accurate5-sales-invoice
branch_code   = <BranchCode yang diisi user>
```

Contoh JS:

```js
const formData = new FormData();
formData.append('files', file, file.name);
formData.append('template_code', 'accurate5-sales-invoice');
formData.append('branch_code', branchCode.trim());

await fetch('/api/conversions/EXCEL/XML', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

Jangan set `Content-Type` manual saat menggunakan `FormData`.

---

## BranchCode

BranchCode wajib diisi sebelum submit.

FE validation:

```text
trim(branch_code) !== ''
```

Backend tetap menjadi source of truth dan akan menolak BranchCode kosong.

Jangan hardcode BranchCode KATO di FE karena user sudah menentukan bahwa Accurate memiliki beberapa database/BranchCode.

---

## Source Excel

Finance tidak perlu memakai header XML Accurate seperti:

```text
<INVOICENO>
<ITEMNO>
```

Finance tetap menggunakan template Google Sheet existing dan export ke XLS/XLSX.

Backend mapping berdasarkan nama header Finance.

Minimum header yang dibutuhkan:

```text
Accurate Inv. No.
Tgl Faktur
Customer ID
Kode Barang
QUANTITY
UNIT PRICE
```

Urutan kolom tidak menjadi contract FE.

---

## Important Row Behavior

FE tidak perlu melakukan grouping atau preprocessing.

Rule backend:

```text
1 Excel row
= 1 SALESINVOICE
= 1 ITEMLINE
```

Jika file mempunyai:

```text
AKKGLG260827A | item A
AKKGLG260827A | item B
```

backend tetap menghasilkan dua `SALESINVOICE` terpisah dengan invoice number yang sama.

FE jangan:

- group berdasarkan invoice number;
- deduplicate row;
- merge item;
- mengubah invoice number;
- melakukan lookup/mapping value.

Kirim file asli hasil export Finance.

---

## Conversion Status

Lifecycle tetap mengikuti generic Dataforge:

```text
QUEUED
VALIDATING
PROCESSING
PAUSING
PAUSED
COMPLETING
COMPLETED
REJECTED
FAILED
EXPIRED
```

Gunakan capabilities backend untuk menampilkan Pause / Continue / Cancel sesuai rule existing.

Control endpoints tetap:

```http
POST /api/conversions/:id/pause
POST /api/conversions/:id/continue
POST /api/conversions/:id/cancel
```

Download tetap:

```http
GET /api/conversions/:id/download
```

---

## Error Handling

Contoh error mapping/header:

```text
XML_SOURCE_HEADER_MISMATCH
```

Artinya file Finance tidak mempunyai satu atau lebih header wajib.

Contoh BranchCode:

```text
BRANCH_CODE_REQUIRED
```

Tampilkan message backend; tidak perlu membuat mapping error sendiri di FE.

---

## Download

Tidak ada flow baru untuk download.

Saat batch:

```text
status = COMPLETED
download_available = true
```

aktifkan action Download seperti conversion lain.

Hasil converter tetap masuk lifecycle result/ZIP Dataforge existing.

---

## Recommended Display in History

Untuk batch XML, tampilkan paling tidak:

```text
Batch Name
Excel -> XML
Template: KATO - Accurate 5 Sales Invoice
Status
Progress
Records
Created By
Completed At
Expiry
Action
```

`Records` untuk template ini berarti jumlah source row valid / jumlah `SALESINVOICE` yang dihasilkan.

---

## Future Expansion

Jangan hardcode UI menjadi hanya satu transaction selamanya.

Target hierarchy:

```text
EXCEL_TO_XML
└── KATO
    ├── Sales Invoice
    ├── Payment
    ├── Sales Return
    ├── Warehouse Transfer
    └── Item Bundling
```

Jika database baru ditambahkan:

```text
EXCEL_TO_XML
├── KATO
└── <DATABASE BARU>
```

Masing-masing database dapat mempunyai mapping header berbeda walaupun transaction type sama.
