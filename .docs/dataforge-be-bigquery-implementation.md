# Dataforge BigQuery Upload - Backend & Database Implementation

Poin penting:

- BigQuery Upload hanya consume conversion batch dengan `target_format = JSONL`.
- Tidak ada direct JSONL file picker/upload dari browser.
- Source batch history normal user hanya miliknya; IT/SIT melihat semua.
- Dataset access memakai ACL USER/DEPARTMENT/COMPANY.
- Actual source files otomatis di-resolve dari seluruh `conversion_files` OUTPUT JSONL berdasarkan `conversion_batch_id`.
- Existing Convert Download dan generic pause/continue/cancel tidak diubah.


## 1. Scope Final

Fitur ini menambahkan module `BIGQUERY` ke Dataforge untuk mengirim hasil conversion yang target-nya `JSONL` ke BigQuery.

Source BigQuery Upload **bukan file upload dari browser**.

Flow final:

```text
Convert
  source format apa pun
        ↓
  target_format = JSONL
        ↓
conversion_batches + conversion_files OUTPUT JSONL
        ↓
BigQuery Upload page
        ↓
user pilih dataset + table + batch + write preference
        ↓
backend resolve seluruh JSONL part dari conversion_batch_id
        ↓
validate
        ↓
BigQuery load job
```

Contoh batch eligible:

```text
XLSX -> JSONL  YES
XLS  -> JSONL  YES
CSV  -> JSONL  YES
future format -> JSONL YES
Excel -> PDF    NO
Excel -> XML    NO
```

Rule utamanya hanya:

```text
target_format = JSONL
```

Menu `Convert` tetap berjalan seperti sekarang dan hasil conversion tetap dapat didownload sesuai lifecycle existing.

---

## 2. Multi-user Rules

### Source batch history

Normal user hanya mendapat batch miliknya sendiri:

```text
conversion_batches.created_by = req.user.id
```

IT dengan department code `SIT` melihat seluruh batch target JSONL.

### BigQuery upload history

Normal user hanya melihat `bigquery_load_jobs.created_by = req.user.id`.

IT melihat seluruh load history.

### Batch identity

Semua action menggunakan UUID:

```text
conversion_batch_id
```

Jangan memakai `batch_name` sebagai identifier. Duplicate batch name tetap aman karena identity batch adalah UUID.

---

## 3. Permission Architecture

BigQuery memakai dua lapis authorization.

### Layer 1 - Feature permission

Existing Dataforge permission:

```text
BIGQUERY
└── LOAD_DATA
```

Non-IT harus mendapat permission `BIGQUERY / LOAD_DATA` melalui permission engine existing.

IT (`SIT`) mengikuti behavior existing Dataforge dan mendapat full feature access.

### Layer 2 - Dataset access

Dataset access disimpan di:

```text
bigquery_dataset_access
```

Scope:

```text
USER
DEPARTMENT
COMPANY
```

Precedence:

```text
USER > DEPARTMENT > COMPANY
```

Pada priority yang sama, `DENY` menang atas `ALLOW`.

Setiap ALLOW juga menentukan write action:

```text
can_append
can_write_empty
can_truncate
```

Normal user hanya menerima dataset yang lolos ACL ini. Authorization tetap dicek ulang pada backend untuk table metadata, validation, dan actual load.

IT dapat melihat seluruh dataset yang dapat dilihat service account Dataforge dan dapat memakai seluruh write disposition.

---

## 4. Database Changes

Jalankan:

```text
backend/database/changes/2026-08-19_add_bigquery_upload.sql
```

Migration membuat:

```text
bigquery_dataset_access
bigquery_load_jobs
```

serta menambahkan permission catalog:

```text
BIGQUERY / LOAD_DATA
```

### bigquery_dataset_access

Fungsi:

- dataset ACL per USER / DEPARTMENT / COMPANY;
- `ALLOW` / `DENY`;
- write privilege per dataset;
- tidak bergantung pada filter frontend.

### bigquery_load_jobs

Fungsi:

- permanent upload history;
- audit siapa mengirim batch;
- snapshot source batch dan JSONL parts;
- destination project/dataset/table;
- write disposition;
- BigQuery job ID;
- validation result dan error;
- same-table concurrency lock.

File JSONL tidak disimpan di tabel ini. Field `source_files` hanya snapshot metadata/path conversion output.

---

## 5. Deployment Order - PENTING

Migration harus dijalankan **sebelum replace backend files** karena `conversion-batch.model.js` baru mengecek `bigquery_load_jobs` saat cleanup result expired.

Urutan:

```text
1. Backup backend + DB bila diperlukan.
2. Jalankan backend/database/changes/2026-08-19_add_bigquery_upload.sql.
3. Replace/add file backend dari ZIP sesuai path.
4. Tambahkan env BigQuery.
5. npm install.
6. Pastikan service-account JSON ada di server dan tidak masuk Git.
7. Restart backend/PM2.
8. Test permission + dataset ACL.
9. Test source-batches.
10. Test validation.
11. Test WRITE_APPEND.
12. Test WRITE_EMPTY.
13. Test WRITE_TRUNCATE dengan confirmation.
14. Test dua user ke table yang sama secara bersamaan.
```

Update generic pause/continue/cancel terbaru tidak ditimpa. Patch ini tidak mengganti `dataforge.config.js`, sehingga `CONVERSION_CHECKPOINT_ROWS` existing tetap utuh.

---

## 6. Environment

Tambahkan ke `.env.local` development dan `.env` production sesuai pattern config Dataforge:

```env
GOOGLE_APPLICATION_CREDENTIALS=storage/app/google/even-gearbox-255203-10881c36321f.json
BIGQUERY_PROJECT_ID=even-gearbox-255203
```

Tidak ada:

```env
BIGQUERY_DATASET=
```

Dataset dipilih dinamis dari BigQuery lalu difilter menggunakan Dataforge dataset ACL.

Jangan commit service-account JSON.

Recommended `.gitignore` bila folder tersebut hanya dipakai untuk credential Google:

```gitignore
storage/app/google/
```

atau minimal:

```gitignore
storage/app/google/*.json
```

---

## 7. Dependency

`package.json` menambahkan:

```text
@google-cloud/bigquery
```

Setelah replace:

```bash
cd backend
npm install
```

`npm install` akan meng-update `package-lock.json` project aktual. ZIP sengaja tidak membawa lockfile hasil rekayasa agar lockfile dibentuk oleh npm dari dependency tree project yang benar.

---

## 8. Files Added / Changed

### New

```text
src/constants/bigquery.constant.js
src/controllers/bigquery.controller.js
src/middleware/bigquery-access.middleware.js
src/models/bigquery-dataset-access.model.js
src/models/bigquery-load-job.model.js
src/routes/bigquery.routes.js
src/services/bigquery-access.service.js
src/services/bigquery.service.js
src/validators/bigquery.validator.js
```

### Changed

```text
src/config/index.js
src/models/conversion-batch.model.js
src/routes/index.js
package.json
```

### Not changed

```text
src/config/dataforge.config.js
src/services/conversion.service.js
src/converters/*
src/templates/*
```

Generic pause/continue/cancel conversion tetap menggunakan implementation terbaru existing.

---

## 9. API Summary

Semua endpoint domain memakai:

```text
authenticate
requireApp(config.app.slug)
```

Endpoint user BigQuery juga membutuhkan:

```text
BIGQUERY / LOAD_DATA
```

Endpoints:

```text
GET  /api/bigquery/source-batches
GET  /api/bigquery/datasets
GET  /api/bigquery/datasets/:datasetId/tables
GET  /api/bigquery/datasets/:datasetId/tables/:tableId
POST /api/bigquery/validate
POST /api/bigquery/loads
GET  /api/bigquery/loads
GET  /api/bigquery/loads/:id
```

IT-only dataset ACL management:

```text
GET    /api/bigquery/access
POST   /api/bigquery/access
PUT    /api/bigquery/access/:id
DELETE /api/bigquery/access/:id
```

---

## 10. Source Batch Endpoint

```http
GET /api/bigquery/source-batches?page=1&limit=20
```

Backend selalu filter:

```text
target_format = JSONL
```

Normal user:

```text
created_by = req.user.id
```

IT:

```text
all target JSONL batches
```

Batch history tetap bisa muncul walaupun belum selectable.

`selectable=true` hanya ketika:

```text
status = COMPLETED
belum expired
punya conversion_files OUTPUT format JSONL
```

Status active/failed/rejected/expired tetap dapat ditampilkan FE sebagai history, tetapi tidak dapat dipilih untuk load.

---

## 11. Resolve JSONL Parts by Batch ID

Request FE hanya mengirim:

```text
conversion_batch_id
```

Backend melakukan:

```text
conversion_batch_id
      ↓
conversion_batches
      ↓
assert owner / IT
assert target_format = JSONL
assert status = COMPLETED
assert belum expired
      ↓
conversion_files
WHERE batch_id = ?
AND file_role = OUTPUT
AND format = JSONL
      ↓
ambil SEMUA JSONL parts
```

Contoh result batch:

```text
Marketplace_001.jsonl
Marketplace_002.jsonl
Marketplace_003.jsonl
```

User tetap hanya memilih satu batch. Backend yang mengumpulkan seluruh part tersebut.

Sebelum dikirim ke BigQuery, backend menggabungkan part ke temporary file:

```text
storage/temp/bigquery/<load-job-id>/load/combined.jsonl
```

Temporary file dihapus setelah `COMPLETED` atau `FAILED`.

---

## 12. Conversion Result Expiry Protection

Existing conversion result punya expiry.

`conversion-batch.model.js` pada patch ini mengubah query cleanup agar batch JSONL yang sedang dipakai active BigQuery load tidak ikut dibersihkan ketika job berstatus:

```text
QUEUED
VALIDATING
LOADING
```

Setelah load selesai/gagal, lock dilepas dan cleanup conversion kembali mengikuti lifecycle normal.

---

## 13. Write Preference

Supported:

```text
WRITE_APPEND
WRITE_EMPTY
WRITE_TRUNCATE
```

Backend mengecek write privilege dari dataset ACL.

### WRITE_TRUNCATE

`WRITE_TRUNCATE` wajib request tambahan:

```json
{
  "truncate_confirmation": "exact_table_name"
}
```

Nilainya harus sama persis dengan `table_id`.

FE confirmation bukan security boundary; backend tetap memvalidasi permission dan confirmation.

---

## 14. Same-table Concurrency

`bigquery_load_jobs.active_destination_hash` memiliki unique key.

Destination hash berasal dari:

```text
project_id + dataset_id + table_id
```

Job active:

```text
QUEUED
VALIDATING
LOADING
```

memegang lock.

Jika user lain mengirim request ke table yang sama saat masih active:

```text
409 BIGQUERY_TABLE_LOAD_IN_PROGRESS
```

Table berbeda tetap dapat diproses paralel.

Lock berada di MySQL, bukan memory Node.js, sehingga tetap berlaku antar-request dan tidak bergantung pada object global process.

---

## 15. Job Lifecycle

```text
QUEUED
  -> VALIDATING
  -> LOADING
  -> COMPLETED
```

Failure:

```text
QUEUED / VALIDATING / LOADING
  -> FAILED
```

BigQuery load history disimpan permanen.

Backend menyimpan `bigquery_job_id` dan location. Startup recovery mencoba:

```text
QUEUED / VALIDATING -> process lagi dari source snapshot
LOADING + bigquery_job_id -> monitor Google job existing
```

---

## 16. Validation

Backend melakukan validation sebelum actual load:

- setiap non-empty line harus valid JSON object;
- field dibandingkan dengan existing destination table schema;
- unknown field dianggap invalid;
- REQUIRED field harus tersedia;
- basic scalar type validation dilakukan;
- maksimal 20 sample error dikembalikan untuk observability;
- actual BigQuery load memakai `maxBadRecords=0` dan `ignoreUnknownValues=false`.

Destination table harus sudah ada. Load menggunakan:

```text
CREATE_NEVER
```

Patch ini tidak membuat table BigQuery otomatis.

---

## 17. Dataset ACL Examples

### User A hanya boleh dataset `itembase` dan `sales`

Gunakan endpoint IT-only `POST /api/bigquery/access` dua kali.

Example `itembase`:

```json
{
  "scope_type": "USER",
  "scope_id": "<USER_A_ID>",
  "dataset_id": "itembase",
  "effect": "ALLOW",
  "can_append": true,
  "can_write_empty": true,
  "can_truncate": false
}
```

Example `sales`:

```json
{
  "scope_type": "USER",
  "scope_id": "<USER_A_ID>",
  "dataset_id": "sales",
  "effect": "ALLOW",
  "can_append": true,
  "can_write_empty": false,
  "can_truncate": false
}
```

### Department Product

```json
{
  "scope_type": "DEPARTMENT",
  "scope_id": "13",
  "dataset_id": "product_staging",
  "effect": "ALLOW",
  "can_append": true,
  "can_write_empty": true,
  "can_truncate": false
}
```

### User-level DENY overrides department ALLOW

```json
{
  "scope_type": "USER",
  "scope_id": "<USER_ID>",
  "dataset_id": "product_staging",
  "effect": "DENY"
}
```

---

## 18. Minimum Backend Test

### Permission

```text
Non-IT tanpa BIGQUERY/LOAD_DATA -> 403
Non-IT dengan feature permission tetapi tanpa dataset ACL -> dataset list kosong / direct dataset access 403
IT -> full feature + dataset visibility
```

### Ownership

```text
User A source history -> hanya batch A
User B source history -> hanya batch B
IT -> batch A + B
User B mencoba conversion_batch_id milik A -> 403
```

### Format

```text
XLSX -> JSONL -> eligible
CSV -> JSONL -> eligible
Excel -> PDF -> tidak muncul di source-batches dan direct batch request ditolak
```

### Concurrency

```text
User A -> dataset.table -> QUEUED/VALIDATING/LOADING
User B -> dataset.table -> 409 BIGQUERY_TABLE_LOAD_IN_PROGRESS
```

### History

```text
Normal user -> hanya load miliknya
IT -> seluruh load
```
