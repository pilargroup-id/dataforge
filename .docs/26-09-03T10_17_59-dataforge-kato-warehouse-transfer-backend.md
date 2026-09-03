# Dataforge - KATO Accurate 5 Warehouse Transfer

## Scope

Template code: `accurate5-warehouse-transfer`

Path:

`backend/src/templates/xml/kato/accurate5-warehouse-transfer`

Source workbook uses the Accurate-style Excel headers directly. There is no GSheet Finance remapping, lookup, or value enrichment.

## Processing rule

- Group source rows by `No. Transfer`.
- One unique `No. Transfer` becomes one `<WTRAN>` transaction.
- Every source row in that group becomes one `<ITEMLINE>`.
- Duplicate item codes are not deduplicated.
- `BranchCode` continues to come from the existing EXCEL_TO_XML conversion option.

## Header mapping

| Excel header | XML field |
|---|---|
| No. Transfer | TRANSFERNO |
| Tgl. Transfer | TRANSFERDATE |
| Keterangan | DESCRIPTION |
| Gudang Asal (FROMWHID) | FROMWHID |
| Gudang Tujuan (TOWHID) | TOWHID |
| Alamat Gudang Asal (opsional) | FROMWHADDRESS |
| Alamat Gudang Tujuan (opsional) | TOWHADDRESS |
| Kode Barang (ITEMNO) | ITEMNO |
| Qty Transfer | QUANTITY |
| Satuan (ITEMUNIT) | ITEMUNIT |
| Rasio Satuan (UNITRATIO) | UNITRATIO |
| Harga Satuan (UNITPRICE, opsional) | UNITPRICE |

## XML defaults

- `TRANSFERID`: empty
- `TRANSACTIONID`: empty
- `ITEMRESERVED1` ... `ITEMRESERVED10`: empty
- `QTYCONTROL`: `0`

## Validation

Required values per row:

- No. Transfer
- Tgl. Transfer
- Gudang Asal
- Gudang Tujuan
- Kode Barang
- Qty Transfer

Rows with the same `No. Transfer` must have the same transfer-level values: date, description, source warehouse, destination warehouse, and optional warehouse addresses.

## Excel raw value handling

This template relies on the generic `EXCEL_TO_XML` reader using `raw: true`. Numeric item identifiers therefore remain their underlying values (for example `682200001533`) instead of the formatted Excel display (`6.822E+11`).
