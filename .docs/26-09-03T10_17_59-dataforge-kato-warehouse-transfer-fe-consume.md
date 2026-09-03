# FE Consume - KATO Accurate 5 Warehouse Transfer

Use existing `EXCEL_TO_XML` flow.

- Database/preset: `KATO`
- Template code: `accurate5-warehouse-transfer`
- Display: `Warehouse Transfer`
- Source: one `.xls` / `.xlsx`
- Branch Code: required, same behavior as other KATO XML templates

The workbook should use the Accurate Warehouse Transfer headers exactly as provided in the backend documentation.

Behavior:

`No. Transfer` is the grouping key. Multiple Excel rows with the same transfer number are sent as one warehouse-transfer transaction with multiple item lines.
