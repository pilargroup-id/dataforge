# Dataforge - Generic Pause / Continue / Cancel

Dokumentasi ini adalah versi terbaru untuk backend dan consume frontend Dataforge setelah fitur kontrol conversion dibuat berlaku untuk seluruh submodule `CONVERT` yang tersedia saat ini.

## Scope update

Submodule yang sekarang mendukung kontrol conversion:

| Permission code | Conversion | Pause | Continue | Cancel |
|---|---|---:|---:|---:|
| `XLSX_TO_JSONL` | XLS/XLSX -> JSONL | Ya | Ya | Ya |
| `EXCEL_TO_PDF` | Excel -> PDF | Ya | Ya | Ya |
| `EXCEL_TO_XML` | Excel -> XML | Ya | Ya | Ya |

Endpoint kontrol berada pada level batch sehingga FE menggunakan endpoint yang sama untuk seluruh jenis conversion.

## Endpoint control

### Pause

```http
POST /api/conversions/:id/pause
```

Tidak membutuhkan body.

Batch yang dapat diminta pause:

- `QUEUED`
- `VALIDATING`
- `PROCESSING`

Response berhasil berarti request pause telah diterima. Proses berhenti pada safe checkpoint berikutnya, sehingga FE dapat sementara menampilkan `PAUSING` sebelum berubah menjadi `PAUSED`.

### Continue

```http
POST /api/conversions/:id/continue
```

Tidak membutuhkan body.

Hanya dapat digunakan ketika status `PAUSED`. Conversion dilanjutkan dari checkpoint terakhir dan tidak memulai ulang output yang telah selesai.

Batch `PAUSED` disimpan maksimal 48 jam. Setelah `pause_expires_at` terlewati, input, partial output, conversion file rows, dan row batch dihapus permanen.

### Cancel

```http
POST /api/conversions/:id/cancel
```

Tidak membutuhkan body.

Cancel dapat digunakan untuk batch:

- `QUEUED`
- `VALIDATING`
- `PROCESSING`
- `PAUSING`
- `PAUSED`
- `COMPLETING`

Cancel adalah hard delete. Backend menghapus batch dari DB, seluruh `conversion_files` melalui foreign-key cascade, file input temporary, partial output, output final yang sudah terbentuk, dan ZIP bila sudah sempat dibuat.

Contoh response:

```json
{
  "success": true,
  "message": "Conversion cancelled and batch data deleted.",
  "data": {
    "id": "<batch-id>",
    "deleted": true
  }
}
```

Setelah cancel, `GET /api/conversions/:id` akan menghasilkan not found.

## Status lifecycle

```text
QUEUED
  -> VALIDATING
  -> PROCESSING
  -> COMPLETING
  -> COMPLETED
```

Pause:

```text
QUEUED / VALIDATING / PROCESSING
  -> PAUSING
  -> PAUSED
```

Continue:

```text
PAUSED
  -> QUEUED
  -> VALIDATING
  -> PROCESSING
  -> ...
```

`PAUSING` penting karena backend tidak memotong file secara paksa di tengah write. Backend menyelesaikan unit checkpoint yang sedang berjalan, menyimpan state yang konsisten, lalu menjadi `PAUSED`.

## Checkpoint per converter

### XLS/XLSX -> JSONL

Checkpoint dilakukan sampai level row, bukan hanya per file.

Default checkpoint setiap 100 row dan selalu pada akhir file. Nilai ini dapat diubah melalui:

```env
CONVERSION_CHECKPOINT_ROWS=100
```

Checkpoint menyimpan posisi berikutnya yang harus diproses:

```json
{
  "next_file_index": 2,
  "next_row_index": 500,
  "processed_records": 12500,
  "last_completed_file": "Marketplace-03.xlsx",
  "last_completed_row_index": 499
}
```

Saat pause, JSONL part yang sedang ditulis ditutup terlebih dahulu dan metadata part disimpan ke `conversion_files`. Saat continue, writer membuka part terakhir dalam append mode jika ukuran part masih di bawah limit. Data sebelum checkpoint tidak ditulis ulang sehingga tidak menghasilkan duplicate JSONL.

Split output tetap mengikuti `MAX_OUTPUT_SIZE_MB`, default 99 MB.

### Excel -> PDF template Yose

Checkpoint per grup `No Pesanan`.

```json
{
  "last_completed_index": 427,
  "last_completed_key": "240812ABC001"
}
```

PDF yang sudah berhasil dibuat disimpan sebagai output partial yang valid. Continue melewati `No Pesanan` yang sudah selesai.

Nama file PDF sekarang menggunakan nilai kolom **No Pesanan**, bukan No Invoice.

Contoh:

```text
Input:
Invoice Toko Goto - Lazada.xlsx

ZIP:
Invoice Toko Goto - Lazada.zip

Isi ZIP:
Invoice Toko Goto - Lazada/
├── 240812ABC001.pdf
├── 240812ABC002.pdf
└── 240812ABC003.pdf
```

Nomor invoice tetap digunakan di isi/template invoice PDF.

### Excel -> XML Accurate 5

Checkpoint dilakukan per invoice Accurate 5.

```json
{
  "last_completed_index": 125,
  "last_completed_key": "INV-000125"
}
```

Backend menyimpan XML sementara dengan suffix `.partial`. Setiap invoice yang sudah selesai ditambahkan ke partial XML dan checkpoint diperbarui. Saat continue, backend melanjutkan invoice berikutnya. Setelah semua invoice selesai, closing NMEXML ditambahkan dan `.partial` diubah menjadi `.xml` final.

Dengan cara ini invoice yang sudah masuk partial XML tidak dibangun ulang.

## GET batch detail

```http
GET /api/conversions/:id
```

Field penting untuk FE:

```json
{
  "status": "PAUSED",
  "progress_percent": 42.5,
  "checkpoint_data": {},
  "paused_at": "2026-08-19T07:00:00.000Z",
  "pause_expires_at": "2026-08-21T07:00:00.000Z",
  "pause_expires_in_seconds": 172800
}
```

FE tidak perlu membaca isi `checkpoint_data` untuk menentukan behavior UI. Field tersebut adalah state internal backend. Gunakan `status` dan `pause_expires_in_seconds`.

## Capabilities

```http
GET /api/conversions/capabilities
```

Setiap conversion sekarang expose:

```json
{
  "permission_code": "XLSX_TO_JSONL",
  "supports_pause_resume": true,
  "supports_cancel": true
}
```

Rekomendasi FE: tampilkan tombol berdasarkan capabilities, bukan hardcode berdasarkan format.

## Rekomendasi tombol FE

| Status | Pause | Continue | Cancel | Download |
|---|---:|---:|---:|---:|
| `QUEUED` | Ya | Tidak | Ya | Tidak |
| `VALIDATING` | Ya | Tidak | Ya | Tidak |
| `PROCESSING` | Ya | Tidak | Ya | Tidak |
| `PAUSING` | Tidak | Tidak | Ya | Tidak |
| `PAUSED` | Tidak | Ya | Ya | Tidak |
| `COMPLETING` | Tidak | Tidak | Ya | Tidak |
| `COMPLETED` | Tidak | Tidak | Tidak | Ya |
| `REJECTED` | Tidak | Tidak | Tidak | Tidak |
| `FAILED` | Tidak | Tidak | Tidak | Tidak |
| `EXPIRED` | Tidak | Tidak | Tidak | Tidak |

Setelah request pause, FE sebaiknya tetap polling detail batch hingga status benar-benar `PAUSED`.

Setelah request continue, FE mulai polling lagi ketika response menunjukkan batch sudah `QUEUED`.

Setelah cancel berhasil, langsung hapus item dari local list/table atau refresh `GET /api/conversions` karena row DB memang sudah tidak ada.

## Duplicate batch name

`batch_name` adalah display name, bukan identity conversion.

Dua batch berikut aman:

```text
Marketplace
Marketplace
```

Masing-masing memiliki UUID `conversion_batches.id` yang berbeda dan result directory berbeda:

```text
storage/results/<batch-id-1>/Marketplace.zip
storage/results/<batch-id-2>/Marketplace.zip
```

Tidak terjadi overwrite antar batch. Semua action FE harus menggunakan `batch.id`, tidak boleh menggunakan `batch_name` sebagai identifier.

## Pause retention

Default:

```env
PAUSED_EXPIRY_HOURS=48
```

Cleanup job mengecek batch paused expired berdasarkan `pause_expires_at`. Jika expired, batch dihapus permanen dari filesystem dan DB.

## Archive finalization protection

ZIP final menggunakan timeout:

```env
ARCHIVE_TIMEOUT_MS=600000
```

Default 10 menit. Tujuannya mencegah batch terus terlihat `PROCESSING`/`COMPLETING` tanpa batas ketika tahap ZIP/finalization bermasalah.

## Database

Fitur pause/resume menggunakan kolom berikut pada `conversion_batches`:

```text
conversion_options
checkpoint_data
paused_at
pause_expires_at
```

Status enum juga harus memiliki:

```text
PAUSING
PAUSED
COMPLETING
```

SQL tersedia pada:

```text
backend/database/changes/2026-08-18_add_pause_resume_cancel.sql
```

Jika SQL tersebut **sudah pernah dijalankan dari patch sebelumnya, jangan jalankan ulang**. Update generic pause/resume tanggal 19 Agustus 2026 tidak membutuhkan kolom DB tambahan.

## File yang berubah pada update generic ini

```text
backend/src/services/conversion.service.js
backend/src/config/dataforge.config.js
backend/src/converters/converter.registry.js
backend/src/converters/excel-to-jsonl/excel-to-jsonl.converter.js
backend/src/converters/excel-to-jsonl/jsonl.writer.js
backend/src/converters/excel-to-pdf/excel-to-pdf.converter.js
backend/src/converters/excel-to-xml/excel-to-xml.converter.js
backend/src/templates/xml/accurate5-sales-invoice/xml.builder.js
```

ZIP juga membawa kembali file lifecycle dari patch sebelumnya agar struktur yang direplace tetap konsisten.

## Urutan deployment

1. Backup source Dataforge yang sedang aktif.
2. Jika migration pause/resume lama belum pernah dijalankan, jalankan `2026-08-18_add_pause_resume_cancel.sql` satu kali.
3. Replace file backend mengikuti path di ZIP.
4. Tambahkan bila belum ada:

```env
PAUSED_EXPIRY_HOURS=48
ARCHIVE_TIMEOUT_MS=600000
CONVERSION_CHECKPOINT_ROWS=100
```

5. Restart backend/PM2.
6. Test ketiga conversion secara terpisah: normal completion, pause, continue, kemudian cancel.

## Minimum test scenario

Untuk setiap conversion:

```text
Create conversion
-> tunggu PROCESSING
-> Pause
-> tunggu PAUSED
-> catat progress
-> Continue
-> pastikan progress melanjutkan checkpoint
-> tunggu COMPLETED
-> download ZIP dan validasi hasil
```

Lalu test batch baru:

```text
Create conversion
-> PROCESSING
-> Cancel
-> GET batch detail harus not found
-> pastikan temp/result directory batch hilang
-> pastikan conversion_batches row hilang
-> pastikan conversion_files row ikut hilang
```
