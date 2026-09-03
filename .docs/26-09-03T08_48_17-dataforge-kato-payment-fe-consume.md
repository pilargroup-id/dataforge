# FE Consume - KATO Accurate 5 Payment

Template:

- code: `accurate5-payment`
- name: `KATO - Accurate 5 Payment`
- database: `KATO`
- transaction: `PAYMENT`
- Branch Code tetap wajib mengikuti flow XML existing.

FE tidak perlu grouping sendiri. Kirim XLS/XLSX Finance apa adanya. Backend akan group otomatis berdasarkan `No Pelunasan`.

Contoh:

`CRTKGH260826 + INV-A`
`CRTKGH260826 + INV-B`

akan menjadi 1 CUSTOMERRECEIPT dengan 2 InvoiceLine.

Gunakan endpoint EXCEL_TO_XML yang sama dengan template code `accurate5-payment`.
