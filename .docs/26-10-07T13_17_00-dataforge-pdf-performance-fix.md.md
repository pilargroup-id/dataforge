# Dataforge Excel -> PDF performance and recovery patch

Affected files only:

- `backend/src/config/dataforge.config.js`
- `backend/src/converters/excel-to-pdf/excel-to-pdf.converter.js`
- `backend/src/models/conversion-batch.model.js`
- `backend/src/models/conversion-file.model.js`
- `backend/src/routes/index.js`
- `backend/src/services/archive.service.js`
- `backend/src/services/conversion.service.js`
- `backend/src/templates/pdf/yose/invoice.template.js`

No SQL migration is required.

## What changed

1. PDF rendering is processed in bounded concurrent windows instead of strictly one-by-one.
2. PDF output metadata and conversion checkpoints are persisted in batches instead of once per generated PDF.
3. Output metadata already persisted during conversion is not written again at the end.
4. PDF ZIP uses compression level 0 by default because PDF files are already compressed.
5. PDF ZIP has a separate 60-minute default timeout.
6. Rupiah/date formatters and logo existence checks in the Yose template are cached.
7. On backend startup, interrupted PDF batches in QUEUED/VALIDATING/PROCESSING/COMPLETING are resumed from their checkpoint when their input file still exists.
8. A PDF batch left in PAUSING during a restart becomes PAUSED.
9. If an interrupted PDF input file no longer exists, the batch becomes FAILED instead of remaining stuck forever.

## Optional environment settings

The defaults work without changing `.env`:

```env
PDF_RENDER_CONCURRENCY=4
PDF_CHECKPOINT_SIZE=20
PDF_ARCHIVE_COMPRESSION_LEVEL=0
PDF_ARCHIVE_TIMEOUT_MS=3600000
```

Suggested starting values for a 4-vCPU server are the defaults above.

Do not set `PDF_RENDER_CONCURRENCY` very high. Start at 4, then test 6 only if CPU and memory remain healthy.

## Behavior of old stuck PDF batches

After deploying/restarting the backend:

- if the original input file is still present under Dataforge temp storage, the batch is queued and resumes from its latest checkpoint;
- if the input file is missing, the batch becomes FAILED with an explicit recovery error;
- it will no longer remain PROCESSING forever only because the server restarted.
