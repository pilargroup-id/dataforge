# Dokumentasi Dataforge

## 1. Ringkasan

Dataforge adalah platform konversi dan pemrosesan file yang dirancang untuk berkembang jangka panjang. Pada fase MVP, Dataforge mendukung konversi batch dari file XLS/XLSX menjadi JSONL yang digabung, dengan validasi struktur kolom, pemecahan output berdasarkan ukuran, pembuatan ZIP, riwayat batch permanen, permission bertingkat, serta penghapusan otomatis file fisik hasil konversi.

Roadmap Dataforge:

- MVP: XLS/XLSX -> JSONL
- Berikutnya: CSV -> JSONL
- Berikutnya: JSON/JSONL -> XLSX
- Berikutnya: multi-format input/output
- Berikutnya: schema mapping, validation, merge, batch history
- Tahap lanjut: preset converter per kebutuhan divisi/sistem

Arsitektur backend tetap mengikuti pola child app PilarGroup dan mempertahankan auth dari template `template-backend-express`.

---

## 2. Struktur Backend

Struktur utama backend:

```text
backend/
├── src/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── converters/
│   ├── jobs/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── transformers/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
│
├── storage/
│   ├── temp/
│   └── results/
│
├── database/
│   ├── migrations/
│   ├── schema/
│   ├── changes/
│   └── seeds/
│
├── .env.example
└── package.json
```

Fungsi folder tambahan:

- `constants/`: nilai tetap seperti status conversion, file format, permission scope.
- `converters/`: engine conversion per pasangan format.
- `jobs/`: proses terjadwal seperti cleanup file expired.
- `models/`: query dan akses database MySQL.
- `transformers/`: transformasi reusable seperti normalisasi header, tanggal, currency, dan row.
- `validators/`: validasi file, batch, schema, dan request bisnis.

---

## 3. Auth dan Akses Child App

Dataforge menggunakan auth PilarGroup.

Semua endpoint terproteksi memakai bearer token:

```http
Authorization: Bearer <token>
```

User harus memiliki `dataforge` di dalam:

```text
GET /api/auth/me -> apps
```

Dataforge menggunakan:

```js
authenticate
requireApp(config.app.slug)
```

Dengan konfigurasi:

```env
APP_NAME=dataforge
APP_SLUG=dataforge
```

### IT Full Access

User dianggap IT apabila salah satu item di:

```text
req.user.departments[]
```

memiliki:

```json
{
  "code": "SIT"
}
```

Pengecekan dilakukan terhadap seluruh department user, bukan hanya department utama.

User IT otomatis memiliki full access ke seluruh fitur Dataforge dan dapat melihat seluruh batch history.

---

## 4. Permission Dataforge

Permission fitur Dataforge disimpan di database lokal Dataforge.

Scope yang didukung:

```text
USER
DEPARTMENT
COMPANY
```

Effect:

```text
ALLOW
DENY
```

Prioritas:

```text
USER > DEPARTMENT > COMPANY
```

Pada scope dengan prioritas yang sama:

- permission submodule lebih spesifik dibanding permission module;
- `DENY` menang atas `ALLOW` apabila specificity sama.

Non-IT yang memiliki akses child app Dataforge tetap dapat membuka aplikasi, tetapi secara default tidak memiliki akses ke modul apa pun.

### Modul MVP

```text
CONVERT
└── XLSX_TO_JSONL
```

Admin permission adalah user dengan department code `SIT`.

---

## 5. Endpoint Auth

### GET `/api/auth/me`

Mengambil profil user dari PilarGroup.

Frontend harus memanggil endpoint ini setelah login.

---

## 6. Endpoint Permission

### GET `/api/permissions/me`

Mengambil effective permission user untuk menentukan modul/submodul yang boleh ditampilkan.

Contoh:

```json
{
  "success": true,
  "message": "Permissions loaded",
  "data": {
    "is_it": false,
    "modules": [
      {
        "code": "CONVERT",
        "name": "Convert",
        "allowed": true,
        "submodules": [
          {
            "code": "XLSX_TO_JSONL",
            "name": "XLS/XLSX to JSONL",
            "allowed": true
          }
        ]
      }
    ]
  }
}
```

Frontend tidak boleh menampilkan submodule dengan:

```json
{
  "allowed": false
}
```

### Endpoint IT-only

```http
GET    /api/permissions/catalog
GET    /api/permissions
POST   /api/permissions
PUT    /api/permissions/:id
DELETE /api/permissions/:id
```

Contoh create permission:

```json
{
  "scope_type": "DEPARTMENT",
  "scope_id": "8",
  "module_code": "CONVERT",
  "submodule_code": "XLSX_TO_JSONL",
  "effect": "ALLOW"
}
```

Directory helper yang tersedia:

```http
GET /api/directory/users
GET /api/directory/departments
```

Keduanya IT-only.

Company permission tetap didukung oleh schema Dataforge, tetapi selector company di frontend harus memakai sumber company ID yang sudah dikonfirmasi.

---

## 7. Flow Conversion MVP

Flow utama:

```text
User memilih satu folder dari PC
        ↓
Frontend membaca seluruh file XLS/XLSX
        ↓
Frontend upload seluruh file sebagai satu batch temporary
        ↓
Backend validasi seluruh struktur header
        ↓
Jika ada satu file berbeda -> seluruh batch ditolak
        ↓
Jika valid -> convert seluruh file
        ↓
Merge seluruh row ke JSONL
        ↓
Split output jika ukuran melebihi batas
        ↓
Buat ZIP per batch
        ↓
Input temporary dihapus
        ↓
Frontend menampilkan Download
        ↓
JSONL/ZIP dihapus otomatis ketika expired
        ↓
Metadata batch tetap tersimpan permanen di MySQL
```

---

## 8. Folder Picker Frontend

Gunakan:

```html
<input
  id="folderInput"
  type="file"
  webkitdirectory
  multiple
  accept=".xls,.xlsx"
/>
```

Contoh relative path:

```text
Marketplace Agustus/1.xlsx
Marketplace Agustus/2.xlsx
Marketplace Agustus/3.xlsx
```

Ambil nama folder:

```js
const files = Array.from(folderInput.files);
const folderName = files[0]?.webkitRelativePath?.split('/')[0];
```

Frontend harus mengirim `folder_name` secara eksplisit.

Backend tidak membaca absolute path lokal user.

---

## 9. Create Conversion Batch

### POST `/api/conversions/XLSX/JSONL`

Content-Type:

```text
multipart/form-data
```

Fields:

```text
folder_name = Marketplace Agustus
files       = 1.xlsx
files       = 2.xlsx
files       = 3.xlsx
```

Contoh frontend:

```js
const formData = new FormData();
formData.append('folder_name', folderName);

for (const file of files) {
  formData.append('files', file, file.name);
}

const response = await fetch('/api/conversions/XLSX/JSONL', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

Jangan set `Content-Type` manual ketika menggunakan `FormData`.

### Batas MVP

- maksimum 20 file per batch;
- maksimum 200 MB per file;
- maksimum 1 GB total per batch;
- hanya `.xls` dan `.xlsx`;
- server berhenti menerima conversion baru setelah `LAST_CONVERSION_START_TIME`, default `19:30`.

Contoh response:

```json
{
  "success": true,
  "message": "Conversion batch created",
  "data": {
    "id": "c7c4d0b0-...",
    "batch_name": "Marketplace_Agustus",
    "original_folder_name": "Marketplace Agustus",
    "source_format": "XLSX",
    "target_format": "JSONL",
    "status": "QUEUED",
    "total_input_files": 3,
    "progress_percent": 0
  }
}
```

Response diterima sebelum proses conversion selesai.

Frontend selanjutnya melakukan polling batch detail atau reload batch history.

---

## 10. Validasi Struktur Kolom

Semua file dalam satu batch harus memiliki struktur header yang sama setelah normalisasi.

Header dinormalisasi menjadi lowercase snake_case.

Contoh:

```text
Nomor Invoice
Nomor-Invoice
NOMOR_INVOICE
```

menjadi:

```text
nomor_invoice
```

Batch ditolak apabila:

- jumlah kolom berbeda;
- nama kolom berbeda;
- urutan kolom berbeda;
- ada header kosong;
- ada dua header yang menjadi nama sama setelah normalisasi.

Contoh batch rejected:

```json
{
  "status": "REJECTED",
  "error_message": "Batch rejected because one or more files have different column structures",
  "validation_errors": {
    "reference_file": "1.xlsx",
    "invalid_files": [
      {
        "file_name": "3.xlsx",
        "expected_headers": ["tanggal", "sku", "qty"],
        "actual_headers": ["tanggal", "sku", "quantity"],
        "missing_headers": ["qty"],
        "unexpected_headers": ["quantity"],
        "order_matches": false
      }
    ]
  }
}
```

---

## 11. Transformasi Data

`transformers/` digunakan untuk logic reusable lintas modul.

Contoh:

```text
header.transformer.js
date.transformer.js
currency.transformer.js
row.transformer.js
```

Transformer reusable dapat dipakai oleh:

```text
XLSX -> JSONL
CSV -> JSONL
JSONL -> XLSX
MERGE
SCHEMA MAPPING
PRESET
```

Transformasi khusus satu converter sebaiknya tetap ditempatkan di dalam folder converter tersebut.

---

## 12. Output JSONL

Output hasil seluruh file digabung menjadi JSONL.

Jika ukuran output melewati batas part, output otomatis dipecah.

Contoh:

```text
Marketplace_Agustus_001.jsonl
Marketplace_Agustus_002.jsonl
```

Batas default:

```env
MAX_OUTPUT_SIZE_MB=99
```

Output JSONL ditulis secara streaming.

Catatan: library `xlsx` tetap membaca workbook Excel ke memory, sehingga file Excel yang besar tetap membutuhkan RAM server yang cukup.

---

## 13. ZIP Hasil Conversion

Setiap batch menghasilkan satu ZIP berdasarkan nama folder upload.

Contoh input:

```text
Marketplace Agustus/
```

Hasil:

```text
Marketplace_Agustus.zip
```

Isi ZIP:

```text
Marketplace_Agustus_001.jsonl
Marketplace_Agustus_002.jsonl
manifest.json
```

Part kedua hanya ada jika hasil melewati batas ukuran.

---

## 14. Batch History

### GET `/api/conversions?page=1&limit=20`

Normal user hanya melihat batch miliknya sendiri.

IT (`SIT`) dapat melihat seluruh batch.

Kolom UI yang disarankan:

```text
Folder / Batch
Source -> Target
Input Files
Progress
Records
Status
Completed At
Expiry
Created By
Action
```

Field penting:

```text
status
progress_percent
total_input_files
processed_input_files
total_output_files
total_records
completed_at
expires_at
download_available
expires_in_seconds
created_by_name
```

Status:

```text
UPLOADING
VALIDATING
QUEUED
PROCESSING
COMPLETED
REJECTED
FAILED
EXPIRED
```

`expires_in_seconds` hanya untuk countdown UI.

`expires_at` dari backend tetap menjadi source of truth.

---

## 15. Batch Detail

### GET `/api/conversions/:id`

Mengembalikan metadata batch beserta history file.

Normal user hanya boleh membuka batch miliknya.

IT boleh membuka seluruh batch.

---

## 16. Download ZIP

### GET `/api/conversions/:id/download`

Download hanya tersedia jika:

```text
status = COMPLETED
download_available = true
expires_at > waktu server saat ini
```

Setelah expired, frontend tetap menampilkan row history tetapi mengganti aksi menjadi:

```text
Expired
File deleted
```

---

## 17. Capabilities

### GET `/api/conversions/capabilities`

Frontend sebaiknya memakai endpoint ini agar tidak hardcode converter yang tersedia.

Contoh MVP:

```json
{
  "success": true,
  "data": {
    "supported_conversions": [
      {
        "source_formats": ["XLS", "XLSX"],
        "target_format": "JSONL",
        "supports_batch": true,
        "supports_merge": true,
        "supports_schema_validation": true,
        "allowed": true
      }
    ]
  }
}
```

---

## 18. Storage

Temporary upload:

```text
backend/storage/temp/<batch-id>/input/
```

Hasil:

```text
backend/storage/results/<batch-id>/
```

File XLS/XLSX temporary dihapus setelah conversion:

- berhasil;
- rejected;
- failed.

Yang bertahan sementara hanya JSONL dan ZIP.

Metadata batch/file tetap tersimpan di MySQL secara permanen.

---

## 19. Expiry dan Cleanup

Expiry final:

```text
min(completed_at + 6 jam, jam 20:00 pada hari yang sama)
```

Contoh:

```text
Selesai 09:00 -> expired 15:00
Selesai 14:00 -> expired 20:00
Selesai 17:00 -> expired 20:00
```

Konfigurasi:

```env
RESULT_EXPIRY_HOURS=6
DAILY_CLEANUP_CUTOFF=20:00
LAST_CONVERSION_START_TIME=19:30
```

Cleanup dilakukan:

1. secara periodik selama server aktif;
2. ketika aplikasi startup;
3. berdasarkan daily cutoff.

Tujuannya agar server PC kantor yang mati malam hari tetap bersih. Jika PC mati sebelum cleanup, file expired akan dibersihkan ketika Dataforge hidup kembali.

Batch history tetap ada setelah file fisik dihapus.

---

## 20. Database

Database:

```text
MySQL
```

Setup awal:

```sql
CREATE DATABASE dataforge
CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;
```

Struktur folder database:

```text
database/
├── migrations/
├── schema/
├── changes/
└── seeds/
```

Fungsi:

- `migrations/`: urutan pembangunan database dari nol;
- `schema/`: snapshot schema lengkap terbaru;
- `changes/`: query perubahan manual untuk database existing;
- `seeds/`: master/initial data.

Batch history disimpan permanen.

File fisik tidak disimpan di database.

---

## 21. Environment

Minimum:

```env
APP_NAME=dataforge
APP_SLUG=dataforge
APP_PORT=3000
NODE_ENV=development

JWT_SECRET=
PILARGROUP_URL=https://pilargroup.id
AUTH_ME_TIMEOUT_MS=10000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=dataforge
DB_CONNECTION_LIMIT=10

CORS_ORIGIN=http://localhost:5173

RESULT_EXPIRY_HOURS=6
DAILY_CLEANUP_CUTOFF=20:00
LAST_CONVERSION_START_TIME=19:30
MAX_OUTPUT_SIZE_MB=99
```

Server OS harus menggunakan timezone kantor yang benar, misalnya:

```text
Asia/Jakarta
```

agar cutoff `19:30` dan `20:00` berjalan sesuai WIB.

---

## 22. Setup Backend

1. Buat database `dataforge`.
2. Apply schema atau migration.
3. Jalankan seed.
4. Salin:

```text
.env.example -> .env
```

5. Isi secret dan konfigurasi database.
6. Pastikan child app Dataforge sudah terdaftar di PilarGroup.
7. Pastikan user testing memiliki:

```text
dataforge
```

di `auth/me -> apps`.

8. Install dependency:

```bash
cd backend
npm install
```

9. Jalankan development:

```bash
npm run dev
```

---

## 23. Catatan untuk Frontend

Urutan frontend yang direkomendasikan:

```text
Login PilarGroup
      ↓
GET /api/auth/me
      ↓
GET /api/permissions/me
      ↓
Render modul sesuai permission
      ↓
User pilih folder
      ↓
POST /api/conversions/XLSX/JSONL
      ↓
Polling/list batch
      ↓
Status COMPLETED
      ↓
Download ZIP
```

Untuk tabel batch:

- tampilkan countdown dari `expires_in_seconds`;
- backend tetap source of truth untuk expiry;
- download hanya aktif ketika `download_available=true`;
- batch `EXPIRED` tetap ditampilkan karena history permanen;
- user biasa hanya mendapat history miliknya;
- IT `SIT` mendapat seluruh history.

---

## 24. Pengembangan Format Selanjutnya

Converter baru harus ditambahkan sebagai module baru di:

```text
src/converters/
```

Jangan memasukkan logic format baru ke auth, controller umum, atau template core.

Target arsitektur:

```text
Controller
   ↓
Service
   ↓
Converter
   ↓
Transformer / Validator
   ↓
Model / File System
```

Contoh future converter:

```text
src/converters/
├── excel-to-jsonl/
├── csv-to-jsonl/
├── json-to-excel/
└── jsonl-to-excel/
```

Dengan pola ini, Dataforge dapat berkembang tanpa merombak auth dan struktur child app yang sudah ada.
