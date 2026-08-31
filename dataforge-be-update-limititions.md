# Dataforge - Update Convert Control & FE Consume

Dokumen ini adalah dokumentasi terbaru untuk perubahan conversion control tanggal 18 Agustus 2026.

## Ringkasan Perubahan

Perubahan utama:

- `EXCEL_TO_PDF` template `yose`: nama PDF sekarang memakai nilai kolom **No Pesanan**, bukan No Invoice.
- Tambah endpoint **Cancel**.
- Tambah endpoint **Pause**.
- Tambah endpoint **Continue** untuk resume dari checkpoint terakhir.
- Batch yang `PAUSED` disimpan maksimal **48 jam**.
- Batch `PAUSED` yang melewati 48 jam dihapus permanen dari filesystem dan database.
- Tambah status `PAUSING`, `PAUSED`, dan `COMPLETING`.
- Finalisasi ZIP diberi timeout agar batch tidak menggantung tanpa batas di status proses.
- Endpoint capabilities sekarang mempunyai `supports_pause_resume` agar FE tidak perlu hardcode converter mana yang mendukung pause/resume.

## SQL yang Wajib Dijalankan

Jalankan sekali pada database Dataforge existing:

```sql
backend/database/changes/2026-08-18_add_pause_resume_cancel.sql
```

SQL tersebut:

- menambah enum status `PAUSING`, `PAUSED`, `COMPLETING`;
- menambah `conversion_options`;
- menambah `checkpoint_data`;
- menambah `paused_at`;
- menambah `pause_expires_at`;
- menambah index `pause_expires_at`.

## Environment Baru

Tambahkan jika ingin override default:

```env
PAUSED_EXPIRY_HOURS=48
ARCHIVE_TIMEOUT_MS=600000
```

Default:

- pause retention: 48 jam;
- ZIP finalization timeout: 600000 ms / 10 menit.

## Status Conversion

Status yang dapat muncul di FE:

```text
UPLOADING
VALIDATING
QUEUED
PROCESSING
PAUSING
PAUSED
COMPLETING
COMPLETED
REJECTED
FAILED
EXPIRED
```

Arti status baru:

| Status | Arti |
|---|---|
| `PAUSING` | User sudah meminta pause. Backend sedang menyelesaikan unit kerja yang sedang aktif sampai safe checkpoint. |
| `PAUSED` | Proses sudah benar-benar berhenti dan dapat dilanjutkan. |
| `COMPLETING` | Semua output converter selesai dan backend sedang membuat/finalisasi ZIP. |

FE jangan menganggap `PAUSING` sebagai sudah berhenti. Tombol Continue baru aktif saat status sudah `PAUSED`.

## Capabilities

### GET `/api/conversions/capabilities`

Sekarang setiap converter mempunyai field:

```json
{
  "supports_pause_resume": true
}
```

Untuk versi update ini, granular pause/resume dengan checkpoint didukung oleh:

```text
EXCEL_TO_PDF
```

Contoh PDF capability:

```json
{
  "source_formats": ["EXCEL", "XLS", "XLSX"],
  "target_format": "PDF",
  "permission_code": "EXCEL_TO_PDF",
  "input_mode": "single",
  "supports_pause_resume": true,
  "default_template_code": "yose"
}
```

Untuk converter yang `supports_pause_resume: false`, FE jangan tampilkan tombol Pause/Continue.

Cancel tetap dapat dipakai untuk batch aktif converter lain.

## EXCEL_TO_PDF Template Yose

### Request

```http
POST /api/conversions/EXCEL/PDF
```

`multipart/form-data`:

```text
files         = Invoice Toko Goto - Lazada.xlsx
template_code = yose
```

Jika `folder_name` kosong, batch name memakai nama file Excel tanpa extension.

### Output ZIP

Input:

```text
Invoice Toko Goto - Lazada.xlsx
```

Output:

```text
Invoice Toko Goto - Lazada.zip
```

Isi ZIP:

```text
Invoice Toko Goto - Lazada/
├── <No Pesanan 1>.pdf
├── <No Pesanan 2>.pdf
├── <No Pesanan 3>.pdf
└── ...
manifest.json
```

Contoh apabila kolom `No Pesanan` berisi:

```text
2408180001
2408180002
2408180003
```

maka output menjadi:

```text
Invoice Toko Goto - Lazada/
├── 2408180001.pdf
├── 2408180002.pdf
└── 2408180003.pdf
```

Isi invoice tetap menampilkan `No Invoice` seperti sebelumnya. Perubahan hanya pada **nama file PDF**.

Jika dua nilai `No Pesanan` menghasilkan nama file sanitized yang sama, backend memberi suffix aman seperti `_002` agar tidak overwrite.

## Pause Conversion

### POST `/api/conversions/:id/pause`

Contoh:

```http
POST /api/conversions/8d3f.../pause
```

Tidak membutuhkan body.

Batch yang dapat dipause:

```text
QUEUED
VALIDATING
PROCESSING
```

Response awal biasanya mempunyai:

```json
{
  "success": true,
  "message": "Pause requested. Batch will stop at the next safe checkpoint.",
  "data": {
    "id": "8d3f...",
    "status": "PAUSING"
  }
}
```

FE setelah klik Pause harus tetap polling:

```http
GET /api/conversions/:id
```

Sampai status berubah menjadi:

```text
PAUSED
```

Pada `EXCEL_TO_PDF`, safe checkpoint berada **setelah satu No Pesanan selesai dibuat menjadi PDF dan checkpoint berhasil tersimpan**.

Contoh:

```text
Total        : 1000 invoice/order
Sudah selesai: 427
User Pause
```

Backend menyelesaikan unit aktif lalu menyimpan checkpoint seperti:

```json
{
  "last_completed_index": 427,
  "last_completed_key": "<No Pesanan>"
}
```

Partial PDF, input Excel, dan metadata checkpoint tetap disimpan selama status `PAUSED`.

## Continue Conversion

### POST `/api/conversions/:id/continue`

Hanya dapat digunakan saat status:

```text
PAUSED
```

Tidak membutuhkan body.

Response:

```json
{
  "success": true,
  "message": "Conversion queued to continue from the last checkpoint.",
  "data": {
    "id": "8d3f...",
    "status": "QUEUED"
  }
}
```

Setelah itu FE kembali polling:

```http
GET /api/conversions/:id
```

Flow:

```text
PAUSED
  -> QUEUED
  -> VALIDATING
  -> PROCESSING
  -> COMPLETING
  -> COMPLETED
```

Untuk template Yose, converter tidak mengulang PDF yang sudah selesai sebelum pause.

Contoh:

```text
1 - 427   sudah selesai sebelum pause
428       proses pertama setelah Continue
...
1000      selesai
```

## Expiry Pause 48 Jam

Saat batch benar-benar masuk `PAUSED`, response batch mempunyai:

```json
{
  "paused_at": "2026-08-18T09:30:00.000Z",
  "pause_expires_at": "2026-08-20T09:30:00.000Z",
  "pause_expires_in_seconds": 172800
}
```

`pause_expires_in_seconds` dapat dipakai FE untuk countdown.

Apabila 48 jam terlewati tanpa Continue:

```text
input temp
partial output
checkpoint
conversion_files
conversion_batches
```

semuanya dihapus permanen.

Karena `conversion_files.batch_id` menggunakan `ON DELETE CASCADE`, file metadata ikut terhapus ketika batch dihapus.

Jika FE mencoba Continue setelah expiry tetapi cleanup periodik belum sempat berjalan, API akan menghapus batch tersebut lalu mengembalikan HTTP `410` dengan code:

```text
PAUSED_BATCH_EXPIRED
```

## Cancel Conversion

### POST `/api/conversions/:id/cancel`

Tidak membutuhkan body.

Dapat dipakai pada:

```text
QUEUED
VALIDATING
PROCESSING
PAUSING
PAUSED
COMPLETING
```

Response sukses:

```json
{
  "success": true,
  "message": "Conversion cancelled and batch data deleted.",
  "data": {
    "id": "8d3f...",
    "deleted": true
  }
}
```

Cancel bersifat **hard delete** sesuai requirement.

Yang dihapus:

```text
conversion_batches row
conversion_files rows via FK cascade
input temp
partial output
ZIP jika sudah sempat dibuat
checkpoint
```

Setelah sukses cancel:

```http
GET /api/conversions/:id
```

akan menghasilkan `404 Conversion batch not found`.

Catatan: jika user menekan Cancel tepat ketika satu file PDF sedang ditulis, row database dihapus sebagai cancellation signal. Backend akan berhenti pada safe checkpoint berikutnya dan melakukan cleanup filesystem kembali. Ini mencegah proses background menghidupkan kembali batch yang sudah dicancel.

## UI Button Recommendation

Gunakan rule berikut:

| Status | Pause | Continue | Cancel | Download |
|---|---:|---:|---:|---:|
| `QUEUED` | Ya* | Tidak | Ya | Tidak |
| `VALIDATING` | Ya* | Tidak | Ya | Tidak |
| `PROCESSING` | Ya* | Tidak | Ya | Tidak |
| `PAUSING` | Tidak | Tidak | Ya | Tidak |
| `PAUSED` | Tidak | Ya | Ya | Tidak |
| `COMPLETING` | Tidak | Tidak | Ya | Tidak |
| `COMPLETED` | Tidak | Tidak | Tidak | Ya jika `download_available=true` |
| `FAILED` | Tidak | Tidak | Tidak | Tidak |
| `REJECTED` | Tidak | Tidak | Tidak | Tidak |
| `EXPIRED` | Tidak | Tidak | Tidak | Tidak |

`*` Pause hanya ditampilkan jika capability converter mempunyai:

```json
"supports_pause_resume": true
```

## Polling FE

Untuk batch aktif, FE dapat polling:

```http
GET /api/conversions/:id
```

Contoh interval UI:

```text
2 - 5 detik
```

Field penting:

```json
{
  "status": "PROCESSING",
  "progress_percent": "42.70",
  "checkpoint_data": {
    "last_completed_index": 427,
    "last_completed_key": "2408180427"
  },
  "paused_at": null,
  "pause_expires_at": null,
  "pause_expires_in_seconds": 0,
  "download_available": false
}
```

Jangan memakai `checkpoint_data` untuk menentukan business action di FE. Field tersebut ditampilkan untuk observability/debugging. Source of truth tombol tetap `status` + `supports_pause_resume`.

## Kenapa Ada Status COMPLETING

Sebelumnya semua PDF bisa sudah selesai dibuat tetapi batch tetap terlihat `PROCESSING` selama finalisasi ZIP/database belum selesai.

Sekarang lifecycle dipisah:

```text
PROCESSING
    output converter sedang dibuat

COMPLETING
    output selesai, backend sedang membuat ZIP/finalisasi metadata

COMPLETED
    ZIP dan database sudah final
```

Pembuatan ZIP juga mempunyai timeout default 10 menit. Jika finalisasi ZIP gagal/timeout, batch masuk `FAILED` dan tidak akan menggantung tanpa batas di `PROCESSING`.

## Endpoint Summary untuk FE

```text
GET  /api/conversions
GET  /api/conversions/capabilities
GET  /api/conversions/:id
GET  /api/conversions/:id/download
GET  /api/conversions/:id/files/:fileId

POST /api/conversions/:sourceFormat/:targetFormat
POST /api/conversions/:id/pause
POST /api/conversions/:id/continue
POST /api/conversions/:id/cancel
```

Semua endpoint tetap mengikuti auth Dataforge yang sudah ada.

## Deployment Order

Untuk backend existing:

```text
1. Backup DB jika diperlukan.
2. Jalankan database/changes/2026-08-18_add_pause_resume_cancel.sql.
3. Replace file JS dari ZIP sesuai path masing-masing.
4. Tambahkan env PAUSED_EXPIRY_HOURS / ARCHIVE_TIMEOUT_MS jika ingin override default.
5. Restart backend.
6. Test capabilities.
7. Test EXCEL_TO_PDF normal sampai COMPLETED.
8. Test Pause -> PAUSED -> Continue -> COMPLETED.
9. Test Cancel dan pastikan GET batch menjadi 404.
```

Tidak ada perubahan permission code. Tetap:

```text
EXCEL_TO_PDF
```

Template tetap:

```text
yose
```
