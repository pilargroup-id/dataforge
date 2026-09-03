# Dataforge - KATO Accurate 5 Sales Invoice XML

## Scope

Patch ini mengubah template `EXCEL_TO_XML` Sales Invoice menjadi preset milik database/owner `KATO`.

Struktur business template:

```text
src/templates/xml/
└── kato/
    └── accurate5-sales-invoice/
        ├── index.js
        ├── schema.js
        └── xml.builder.js
```

Folder lama:

```text
src/templates/xml/accurate5-sales-invoice/
```

hanya menjadi compatibility shim agar `TemplateRegistry` existing tetap dapat menemukan template tanpa perubahan pada registry/converter.

Tidak ada perubahan database dan tidak ada migration SQL untuk patch ini.

---

## Rule Utama

Flow:

```text
Finance isi template Google Sheet
-> export XLS/XLSX
-> upload ke Dataforge
-> pilih EXCEL -> XML
-> template Accurate 5 Sales Invoice / KATO
-> isi BranchCode
-> Dataforge mapping berdasarkan nama header
-> generate XML
-> download hasil
```

Business rule final:

```text
1 row Excel = 1 SALESINVOICE = 1 ITEMLINE
```

Tidak ada grouping berdasarkan invoice number.
Tidak ada deduplication.
Tidak ada VLOOKUP.
Tidak ada lookup master.
Tidak ada mapping value antar sistem.

Jika 5 row mempunyai `Accurate Inv. No.` yang sama, XML tetap menghasilkan 5 blok `SALESINVOICE` dengan nomor yang sama.

---

## Template Code

Template code tetap:

```text
accurate5-sales-invoice
```

Hal ini dipertahankan supaya backend/FE existing yang sudah mengirim `template_code=accurate5-sales-invoice` tidak perlu diubah hanya karena folder business template dipindahkan ke namespace KATO.

Template object sekarang expose metadata:

```json
{
  "database_code": "KATO",
  "transaction_code": "SALES_INVOICE",
  "requires_branch_code": true,
  "input_mapping_mode": "HEADER",
  "row_mode": "ONE_ROW_ONE_SALESINVOICE"
}
```

---

## BranchCode

`BranchCode` berasal dari input user di UI dan dikirim sebagai:

```text
branch_code
```

Request existing sudah mendukung field tersebut dan menyimpannya ke `conversion_options`.

BranchCode wajib untuk template KATO Sales Invoice.

Contoh root output:

```xml
<NMEXML EximID="1" BranchCode="1513362031" ACCOUNTANTCOPYID="">
```

Jika kosong, builder melempar:

```text
BRANCH_CODE_REQUIRED
```

---

## Header Mapping Finance -> Accurate XML

Mapping dilakukan berdasarkan nama header, bukan posisi kolom.

| Header Finance | Target XML | Catatan |
|---|---|---|
| `Accurate Inv. No.` | `INVOICENO` | direct |
| `Tgl Faktur` | `INVOICEDATE` | tanggal dinormalisasi ke `YYYY-MM-DD` |
| `Customer ID` | `CUSTOMERID` | direct |
| `Term Transaction` | `TERMSID` | direct, tidak ada lookup |
| `Location` | `WAREHOUSEID` | direct |
| `Sales Name Netsuite` | `SALESMANID/FIRSTNAME` | direct |
| `Memo Header` | `DESCRIPTION` | direct |
| `Date` | `SHIPDATE` | date format normalization only |
| `Date` | `TAXDATE` | date format normalization only |
| `Exchange Rate` | `RATE` | direct numeric |
| `Exchange Rate` | `FISCALRATE` | direct numeric |
| `AR Account` | `ARACCOUNT` | direct |
| `Currency` | `CURRENCYNAME` | direct; contoh `Rupiah` tidak otomatis diubah menjadi `IDR` |
| `Faktur No` | `TAXFORMNUMBER` | direct |
| `Kode Jenis Transaksi` | `TAXFORMCODE` | direct |
| `Urut` | `KeyID` | direct |
| `Kode Barang` | `ITEMNO` | direct |
| `QUANTITY` | `QUANTITY` | direct numeric |
| `UNIT PRICE` | `UNITPRICE` | direct numeric |
| `UNIT PRICE` | `BRUTOUNITPRICE` | menggunakan nilai unit price yang sama |
| `Tax Code` | `TAXCODES` | direct; tidak dilakukan mapping nilai |
| `Location` | `ITEMLINE/WAREHOUSEID` | direct |

Kolom Finance lain boleh tetap ada di XLS/XLSX. Converter mengabaikan kolom yang tidak mempunyai target mapping.

---

## Required Headers

File harus memiliki minimal:

```text
Accurate Inv. No.
Tgl Faktur
Customer ID
Kode Barang
QUANTITY
UNIT PRICE
```

Jika header wajib tidak ditemukan:

```text
XML_SOURCE_HEADER_MISMATCH
```

Header matching:

- case-insensitive;
- whitespace berlebih dinormalisasi;
- non-breaking space dinormalisasi;
- urutan kolom tidak harus sama dengan Google Sheet awal.

Ini berarti Finance dapat menambah/memindahkan kolom selama nama header yang dibutuhkan tetap tersedia.

---

## Date Handling

Ini bukan business mapping. Hanya normalisasi teknis XML.

Format yang dikenali:

```text
2026-08-27 -> 2026-08-27
27/8/2026 -> 2026-08-27
27-8-2026 -> 2026-08-27
Excel Date object -> 2026-08-27
```

Value lain yang tidak dikenali sebagai format di atas dibiarkan sebagai string source.

---

## One Row One Invoice

Contoh source:

```text
Accurate Inv. No. | Kode Barang   | QUANTITY
AKKGLG260827A     | 682200001533  | 1
AKKGLG260827A     | 682200002294  | 1
```

Output konseptual:

```xml
<SALESINVOICE operation="Add" REQUESTID="1">
  <ITEMLINE operation="Add">
    <ITEMNO>682200001533</ITEMNO>
  </ITEMLINE>
  <INVOICENO>AKKGLG260827A</INVOICENO>
</SALESINVOICE>

<SALESINVOICE operation="Add" REQUESTID="2">
  <ITEMLINE operation="Add">
    <ITEMNO>682200002294</ITEMNO>
  </ITEMLINE>
  <INVOICENO>AKKGLG260827A</INVOICENO>
</SALESINVOICE>
```

Tidak ada grouping walaupun `INVOICENO` sama.

---

## Validation

Blocking validation per row:

```text
Accurate Inv. No. kosong
Kode Barang kosong
QUANTITY kosong / bukan angka
UNIT PRICE kosong / bukan angka
```

Warning:

```text
Customer ID kosong
Tgl Faktur kosong
```

Validation ini tidak melakukan pengecekan ke database Accurate dan tidak melakukan lookup master.

---

## Pause / Continue / Cancel

Patch ini tidak mengganti lifecycle conversion Dataforge.

Existing generic control tetap dipakai:

```text
POST /api/conversions/:id/pause
POST /api/conversions/:id/continue
POST /api/conversions/:id/cancel
```

Karena `groupInvoices()` sekarang menghasilkan tepat satu invoice object untuk setiap source row, checkpoint `EXCEL_TO_XML` secara efektif menjadi checkpoint per row/SALESINVOICE.

Duplicate `Accurate Inv. No.` tidak dipakai sebagai identity conversion. Posisi checkpoint tetap harus mengikuti index conversion existing.

---

## Endpoint Create

Tetap menggunakan endpoint existing:

```http
POST /api/conversions/EXCEL/XML
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

```text
files         = finance-sales-invoice.xlsx
template_code = accurate5-sales-invoice
branch_code   = 1513362031
```

Input mode tetap single file.

---

## File Patch

Replace/add:

```text
backend/src/templates/xml/kato/accurate5-sales-invoice/index.js
backend/src/templates/xml/kato/accurate5-sales-invoice/schema.js
backend/src/templates/xml/kato/accurate5-sales-invoice/xml.builder.js

backend/src/templates/xml/accurate5-sales-invoice/index.js
backend/src/templates/xml/accurate5-sales-invoice/schema.js
backend/src/templates/xml/accurate5-sales-invoice/xml.builder.js
```

Tiga file pada folder flat adalah compatibility shim. Jangan menambahkan business mapping baru di sana.

Semua pengembangan KATO berikutnya ditempatkan di:

```text
src/templates/xml/kato/
```

Contoh roadmap:

```text
src/templates/xml/kato/
├── accurate5-sales-invoice/
├── accurate5-payment/
├── accurate5-sales-return/
├── accurate5-warehouse-transfer/
└── accurate5-item-bundling/
```

Jika ada database Accurate baru, buat namespace sibling baru, misalnya:

```text
src/templates/xml/goto/
```

Mapping KATO tidak boleh dipakai otomatis oleh database lain.

---

## Deployment

1. Backup folder template XML existing.
2. Copy folder/file patch ke backend sesuai path.
3. Tidak perlu SQL migration.
4. Tidak perlu perubahan `.env` baru untuk patch ini.
5. Restart backend.
6. Test `GET /api/conversions/capabilities` dan pastikan template XML masih tersedia.
7. Test conversion menggunakan Finance XLS/XLSX dan BranchCode testing.
8. Download hasil XML dan test import ke database Accurate 5 KATO.

---

## Minimum Regression Test

### Duplicate invoice

Input dua row dengan `Accurate Inv. No.` sama.

Expected:

```text
2 SALESINVOICE
2 ITEMLINE
INVOICENO yang sama muncul 2 kali
```

### Direct values

Pastikan:

```text
Location = GOTO SOLD
-> XML WAREHOUSEID = GOTO SOLD

Currency = Rupiah
-> XML CURRENCYNAME = Rupiah

Tax Code = PPN:12% - 2025
-> XML TAXCODES = PPN:12% - 2025
```

Tidak boleh ada lookup/value substitution otomatis.

### Pause resume

```text
Start conversion besar
-> PROCESSING
-> Pause
-> tunggu PAUSED
-> Continue
-> COMPLETED
-> jumlah SALESINVOICE final harus sama dengan jumlah source row valid
```
