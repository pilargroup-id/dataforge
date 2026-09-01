# Dataforge BigQuery Upload - Frontend Consume

## 1. UI Concept Final

BigQuery Upload tidak mempunyai file picker.

Source berasal dari history conversion Dataforge yang:

```text
target_format = JSONL
```

Source format bebas.

Contoh:

```text
XLSX -> JSONL
XLS -> JSONL
CSV -> JSONL
future source -> JSONL
```

Menu `Convert` tetap seperti sekarang dan tetap menyediakan Download hasil conversion.

BigQuery page hanya menjadi consumer tambahan untuk batch JSONL yang sama.

---

## 2. Recommended Page Layout

Satu page:

```text
BigQuery Upload

Destination
------------------------------------------------
Dataset          [ itembase            v ]
Table            [ master_items        v ]
Write Preference [ WRITE_APPEND        v ]

JSONL Conversion Batch History
------------------------------------------------
Search/filter UI optional

( ) Marketplace Agustus
    XLSX -> JSONL
    COMPLETED
    428,391 records
    3 JSONL parts
    Available

( ) Stock Master
    CSV -> JSONL
    COMPLETED
    82,412 records
    1 JSONL part
    Available

( ) Marketplace July
    XLSX -> JSONL
    EXPIRED
    Not selectable

Selected Batch
------------------------------------------------
Marketplace Agustus
3 JSONL parts
428,391 records

[ Validate ] [ Load to BigQuery ]

BigQuery Upload History
------------------------------------------------
Source Batch | Dataset | Table | Write | Rows | Status | Time
```

History conversion JSONL dan selector batch berada di page yang sama.

---

## 3. Permission Bootstrap

Existing app flow tetap:

```text
GET /api/auth/me
GET /api/permissions/me
```

Tampilkan menu BigQuery hanya jika effective permission:

```text
BIGQUERY / LOAD_DATA = allowed
```

IT existing tetap full access.

Dataset tetap tidak boleh di-hardcode dari FE.

---

## 4. Load JSONL Source Batch History

```http
GET /api/bigquery/source-batches?page=1&limit=20
Authorization: Bearer <token>
```

Backend rule:

```text
Normal user -> hanya conversion batch miliknya
IT/SIT      -> semua target JSONL batch
```

Backend sudah filter:

```text
target_format = JSONL
```

Source format tidak perlu difilter FE.

Example response:

```json
{
  "success": true,
  "message": "BigQuery JSONL source batches loaded",
  "data": [
    {
      "id": "c7c4d0b0-1111-2222-3333-444444444444",
      "batch_name": "Marketplace_Agustus",
      "original_folder_name": "Marketplace Agustus",
      "source_format": "XLSX",
      "target_format": "JSONL",
      "status": "COMPLETED",
      "total_input_files": 20,
      "total_output_files": 3,
      "total_records": 428391,
      "completed_at": "2026-08-19T04:20:00.000Z",
      "expires_at": "2026-08-19T10:20:00.000Z",
      "created_by": "<user-id>",
      "created_by_name": "Azi",
      "output_jsonl_file_count": 3,
      "output_jsonl_size_bytes": 232783210,
      "selectable": true,
      "availability": "AVAILABLE"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Gunakan:

```text
id
```

sebagai `conversion_batch_id` pada validate/load.

Jangan gunakan `batch_name` sebagai ID.

---

## 5. Source Batch Selection Rules

FE boleh menampilkan seluruh history response.

Enable radio/select hanya jika:

```json
{
  "selectable": true,
  "availability": "AVAILABLE"
}
```

Contoh non-selectable:

```text
QUEUED
VALIDATING
PROCESSING
PAUSING
PAUSED
COMPLETING
FAILED
REJECTED
EXPIRED
```

FE tidak perlu membaca `checkpoint_data` conversion untuk BigQuery Upload.

Batch yang sedang pause/processing akan otomatis menjadi selectable setelah conversion selesai dan source history direfresh.

---

## 6. Dataset Dropdown

```http
GET /api/bigquery/datasets
Authorization: Bearer <token>
```

Response normal user hanya berisi dataset yang diizinkan ACL backend.

Example:

```json
{
  "success": true,
  "message": "BigQuery datasets loaded",
  "data": [
    {
      "id": "itembase",
      "project_id": "even-gearbox-255203",
      "permissions": {
        "append": true,
        "write_empty": true,
        "truncate": false
      }
    },
    {
      "id": "sales",
      "project_id": "even-gearbox-255203",
      "permissions": {
        "append": true,
        "write_empty": false,
        "truncate": false
      }
    }
  ]
}
```

FE tidak perlu dan tidak boleh mencoba menampilkan dataset yang tidak ada dalam response.

---

## 7. Table Dropdown

Setelah user memilih dataset:

```http
GET /api/bigquery/datasets/:datasetId/tables
Authorization: Bearer <token>
```

Example:

```http
GET /api/bigquery/datasets/itembase/tables
```

Response:

```json
{
  "success": true,
  "message": "BigQuery tables loaded",
  "data": [
    {
      "id": "master_items",
      "dataset_id": "itembase"
    },
    {
      "id": "inactive_items",
      "dataset_id": "itembase"
    }
  ]
}
```

Jika user memanipulasi dataset ID yang tidak diizinkan, backend tetap mengembalikan 403.

---

## 8. Table Metadata / Schema

```http
GET /api/bigquery/datasets/:datasetId/tables/:tableId
Authorization: Bearer <token>
```

Example:

```http
GET /api/bigquery/datasets/itembase/tables/master_items
```

Field penting:

```json
{
  "success": true,
  "data": {
    "project_id": "even-gearbox-255203",
    "dataset_id": "itembase",
    "table_id": "master_items",
    "type": "TABLE",
    "num_rows": "824319",
    "schema": {
      "fields": []
    },
    "permissions": {
      "append": true,
      "write_empty": true,
      "truncate": false
    }
  }
}
```

Gunakan `permissions` untuk enable/disable Write Preference.

---

## 9. Write Preference UI

Mapping:

```text
Append to table        -> WRITE_APPEND
Write only if empty    -> WRITE_EMPTY
Overwrite table        -> WRITE_TRUNCATE
```

Contoh berdasarkan response:

```json
{
  "append": true,
  "write_empty": true,
  "truncate": false
}
```

UI:

```text
WRITE_APPEND   enabled
WRITE_EMPTY    enabled
WRITE_TRUNCATE disabled
```

Backend tetap mengecek permission lagi. Disabled UI bukan authorization boundary.

---

## 10. Validate Before Load

Recommended flow: user pilih dataset, table, batch, write preference lalu klik Validate.

```http
POST /api/bigquery/validate
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "conversion_batch_id": "c7c4d0b0-1111-2222-3333-444444444444",
  "dataset_id": "itembase",
  "table_id": "master_items",
  "write_disposition": "WRITE_APPEND"
}
```

Example valid response:

```json
{
  "success": true,
  "message": "BigQuery preflight validation passed",
  "data": {
    "source": {
      "conversion_batch_id": "c7c4d0b0-1111-2222-3333-444444444444",
      "batch_name": "Marketplace_Agustus",
      "source_format": "XLSX",
      "target_format": "JSONL",
      "jsonl_files": 3,
      "size_bytes": 232783210,
      "conversion_records": 428391
    },
    "destination": {
      "project_id": "even-gearbox-255203",
      "dataset_id": "itembase",
      "table_id": "master_items"
    },
    "write_disposition": "WRITE_APPEND",
    "validation": {
      "valid": true,
      "total_records": 428391,
      "invalid_records": 0,
      "error_samples": []
    }
  }
}
```

Invalid schema tetap HTTP 200 untuk endpoint preflight, dengan:

```json
{
  "validation": {
    "valid": false,
    "invalid_records": 23,
    "error_samples": []
  }
}
```

FE harus cek:

```text
data.validation.valid
```

sebelum enable action Load.

---

## 11. Create BigQuery Load

```http
POST /api/bigquery/loads
Authorization: Bearer <token>
Content-Type: application/json
```

`WRITE_APPEND` example:

```json
{
  "conversion_batch_id": "c7c4d0b0-1111-2222-3333-444444444444",
  "dataset_id": "itembase",
  "table_id": "master_items",
  "write_disposition": "WRITE_APPEND"
}
```

Response dibuat sebelum BigQuery selesai:

```json
{
  "success": true,
  "message": "BigQuery load job created",
  "data": {
    "id": "<load-job-uuid>",
    "conversion_batch_id": "c7c4d0b0-1111-2222-3333-444444444444",
    "source_batch_name": "Marketplace_Agustus",
    "source_format": "XLSX",
    "target_format": "JSONL",
    "dataset_id": "itembase",
    "table_id": "master_items",
    "write_disposition": "WRITE_APPEND",
    "status": "QUEUED"
  }
}
```

Backend otomatis mengambil seluruh JSONL part berdasarkan `conversion_batch_id`.

Tidak ada array file ID yang perlu dikirim FE.

---

## 12. WRITE_TRUNCATE Confirmation

Sebelum submit, recommended modal:

```text
Overwrite BigQuery Table

Dataset: itembase
Table: master_items
Existing rows: 824,319

This action replaces existing table data.
Type the table name to confirm:

[ master_items ]
```

Request:

```json
{
  "conversion_batch_id": "c7c4d0b0-1111-2222-3333-444444444444",
  "dataset_id": "itembase",
  "table_id": "master_items",
  "write_disposition": "WRITE_TRUNCATE",
  "truncate_confirmation": "master_items"
}
```

Jika confirmation tidak match:

```text
400 BIGQUERY_TRUNCATE_CONFIRMATION_REQUIRED
```

---

## 13. Load Job Status / Polling

Lifecycle:

```text
QUEUED
VALIDATING
LOADING
COMPLETED
FAILED
```

Poll:

```http
GET /api/bigquery/loads/:id
```

Recommended interval:

```text
2 - 5 detik
```

Stop polling pada:

```text
COMPLETED
FAILED
```

---

## 14. BigQuery Upload History

```http
GET /api/bigquery/loads?page=1&limit=20
Authorization: Bearer <token>
```

Rule:

```text
Normal user -> hanya upload/load miliknya
IT/SIT      -> seluruh upload/load history
```

Recommended columns:

```text
Source Batch
Source Format
Dataset
Table
Write Preference
JSONL Parts
Rows
Status
Created By
Started At
Completed At
Action/Detail
```

IT dapat memakai `created_by_name` untuk melihat uploader.

---

## 15. Same-table Concurrency Error

Jika ada active load ke destination yang sama:

```text
project.dataset.table
```

request berikutnya mendapatkan:

```json
{
  "success": false,
  "message": "Another BigQuery load is currently running for this destination table",
  "errors": {
    "code": "BIGQUERY_TABLE_LOAD_IN_PROGRESS"
  }
}
```

FE tampilkan pesan bahwa table tersebut sedang diproses user/job lain dan refresh history setelahnya.

Table berbeda tetap dapat diproses paralel.

---

## 16. Important Errors

```text
PERMISSION_DENIED
BIGQUERY_NOT_CONFIGURED
BIGQUERY_DATASET_FORBIDDEN
BIGQUERY_WRITE_DISPOSITION_FORBIDDEN
BIGQUERY_CONVERSION_NOT_FOUND
BIGQUERY_CONVERSION_FORBIDDEN
BIGQUERY_SOURCE_NOT_JSONL
BIGQUERY_CONVERSION_NOT_COMPLETED
BIGQUERY_CONVERSION_EXPIRED
BIGQUERY_CONVERSION_FILE_EXPIRED
BIGQUERY_SOURCE_FILES_NOT_FOUND
BIGQUERY_TABLE_NOT_WRITABLE
BIGQUERY_TABLE_NOT_EMPTY
BIGQUERY_TRUNCATE_CONFIRMATION_REQUIRED
BIGQUERY_TABLE_LOAD_IN_PROGRESS
BIGQUERY_GCP_FORBIDDEN
BIGQUERY_RESOURCE_NOT_FOUND
BIGQUERY_LOAD_NOT_FOUND
BIGQUERY_LOAD_FORBIDDEN
```

---

## 17. Full FE Flow

```text
Open BigQuery Upload
        ↓
GET /api/bigquery/source-batches
        ↓
render JSONL conversion history
normal user own batch / IT all
        ↓
GET /api/bigquery/datasets
        ↓
select dataset
        ↓
GET /api/bigquery/datasets/:datasetId/tables
        ↓
select table
        ↓
GET table metadata
        ↓
select allowed write preference
        ↓
select one source batch with selectable=true
        ↓
POST /api/bigquery/validate
        ↓
validation.valid = true
        ↓
if WRITE_TRUNCATE -> confirmation table name
        ↓
POST /api/bigquery/loads
        ↓
receive load job UUID + QUEUED
        ↓
poll GET /api/bigquery/loads/:id
        ↓
COMPLETED / FAILED
        ↓
refresh BigQuery Upload History
```

---

## 18. Convert Page Remains Unchanged

BigQuery integration tidak mengganti existing Convert UX.

```text
Convert page
  -> create conversion
  -> pause / continue / cancel sesuai capabilities
  -> completed
  -> Download tetap tersedia selama result belum expired
```

Batch yang sama kemudian dapat muncul pada BigQuery Upload page jika:

```text
target_format = JSONL
```

Jadi satu conversion result memiliki dua consumer action berbeda:

```text
Convert page   -> Download
BigQuery page  -> Load to BigQuery
```
