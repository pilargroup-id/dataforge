# Dataforge FE Consume - KATO Sales Return

Template code: `accurate5-sales-return`.

UI flow:

1. Source Excel.
2. Target XML.
3. Database KATO.
4. Transaction Sales Return / Retur Penjualan.
5. Input BranchCode.
6. Upload XLS/XLSX Finance.
7. Submit conversion existing endpoint.

Request multipart:

`POST /api/conversions/EXCEL/XML`

- `files`
- `template_code=accurate5-sales-return`
- `branch_code=<branch-code>`

Tidak perlu grouping atau preprocessing di FE. Backend memproses satu row menjadi satu SALESRETURN.
