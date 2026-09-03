# Dataforge KATO Accurate 5 Payment

## Scope

Template code: `accurate5-payment`

Path:

`backend/src/templates/xml/kato/accurate5-payment/`

Flow:

`Finance GSheet -> XLS/XLSX -> Dataforge EXCEL_TO_XML -> KATO Payment -> Accurate 5 NMEXML CUSTOMERRECEIPT`

## Grouping Rule

Payment berbeda dengan SI/Retur.

- Group berdasarkan `No Pelunasan`.
- 1 unique `No Pelunasan` = 1 `CUSTOMERRECEIPT`.
- Setiap source row dalam group = 1 `InvoiceLine`.
- `Sales Invoice` -> `ARINVOICEID`.
- `Jumlah Pelunasan1` -> `PAYMENTAMOUNT` per InvoiceLine.
- `CHEQUEAMOUNT` = SUM seluruh `Jumlah Pelunasan` dalam group No Pelunasan.

## Header Mapping

| Accurate XML | Finance Header / Rule |
|---|---|
| SEQUENCENO | No Pelunasan |
| PAYMENTDATE | TGL PELUNASAN |
| BILLTOID | Customer ID |
| BANKACCOUNT | hardcode `1000.02.01` |
| CHEQUENO | empty |
| CHEQUEDATE | empty |
| CHEQUEAMOUNT | sum `Jumlah Pelunasan` per No Pelunasan |
| RATE | Exchange Rate |
| DESCRIPTION | Memo Header |
| FISCALPMT | empty |
| CURRENCYNAME | Currency |
| APPLYFROMCREDIT | empty |
| RETURNCREDIT | empty |
| ARINVOICEID | Sales Invoice |
| PAYMENTAMOUNT | Jumlah Pelunasan1 |
| DISCTAKENAMOUNT | empty |
| PPH23AMOUNT | empty |
| PPH23RATE | empty |
| PPH23FISCALRATE | empty |
| PPH23NUMBER | empty |

`Sales Invoice Internal ID`, customer display fields, term, due date, location, department, activity, dan field Finance lain yang tidak dipakai tetap boleh ada dan di-ignore.

## Validation

Dalam satu `No Pelunasan`, field berikut wajib konsisten:

- Customer ID
- TGL PELUNASAN
- Currency
- Exchange Rate

Jika berbeda, conversion gagal sebagai schema validation error agar satu CUSTOMERRECEIPT tidak mencampur customer/date/currency yang berbeda.

## Compatibility

Template tetap mengekspos fungsi `groupInvoices` dan property `INVOICENO` pada group untuk compatibility dengan generic `excel-to-xml.converter.js` existing (checkpoint masih membaca `invoice.INVOICENO`).

Generic pause/continue/cancel tidak diubah.
