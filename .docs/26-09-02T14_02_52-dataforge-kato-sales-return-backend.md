# Dataforge - KATO Accurate 5 Sales Return XML

## Scope

Add template baru:

`backend/src/templates/xml/kato/accurate5-sales-return/`

Template code: `accurate5-sales-return`.

Tidak ada migration SQL dan tidak mengubah lifecycle generic conversion.

## Rule Final

`1 row Finance = 1 SALESRETURN = 1 ITEMLINE`.

Tidak ada grouping, dedup, VLOOKUP, master lookup, atau value remapping.

## Header Finance

Kolom baru di posisi A: `No. Invoice Asal`. Mapping berbasis nama header, jadi posisi kolom tidak dipakai sebagai identity mapping.

## Mapping

| Target XML Accurate | Source Finance / Rule |
|---|---|
| INVOICENO | No. Faktur |
| INVOICEDATE | Tgl Faktur |
| CUSTOMERID | Customer ID |
| SALESINVOICEID | No. Invoice Asal |
| DELIVERYORDERID | kosong |
| WAREHOUSEID | Location |
| SALESMANID | kosong |
| DESCRIPTION | Memo Header |
| TAX1CODE | kosong |
| TAX1RATE | kosong |
| TAX2CODE | kosong |
| TAX2RATE | kosong |
| RATE | Exchange Rate |
| INCLUSIVETAX | hardcode 1 |
| CUSTOMERISTAXABLE | kosong |
| CASHDISCOUNT | kosong |
| CASHDISCPC | kosong |
| CURRENCYNAME | Currency |
| GLYEAR | kosong |
| GLPERIOD | kosong |
| INVOICESEQ | kosong |
| ITEMNO | Kode Barang |
| ITEMOVDESC | Item |
| QUANTITY | QUANTITY |
| ITEMUNIT | kosong |
| UNITRATIO | kosong |
| UNITPRICE | UNIT PRICE |
| BRUTTOUNITPRICE | Harga Setelah PPN |
| ITEMDISCPC | kosong |
| TAXCODES | hardcode 4 |
| ITEMLINE/WAREHOUSEID | Location |
| INVID | No. Invoice Asal |
| DOID | kosong |

Tanggal hanya dinormalisasi secara teknis menjadi YYYY-MM-DD jika input berbentuk DD/MM/YYYY atau DD-MM-YYYY.

## Request

Endpoint existing tetap:

`POST /api/conversions/EXCEL/XML`

Form fields:

- `files` = xls/xlsx Finance
- `template_code` = `accurate5-sales-return`
- `branch_code` = BranchCode Accurate yang dipilih user

## Deployment

Copy folder patch ke project. Tidak perlu copy folder flat legacy `src/templates/xml/accurate5-sales-return`.

Sesudah restart, cek `GET /api/conversions/capabilities`. Jika template baru belum muncul, registry/template discovery current project perlu ditambahkan entry `accurate5-sales-return`; file registry current tidak termasuk source yang tersedia pada patch ini sehingga sengaja tidak ditebak/ditimpa.
