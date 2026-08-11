const path = require('path');
const { readRows } = require('./excel.reader');
const { JsonlPartWriter } = require('./jsonl.writer');
const { validateSameSchema } = require('../../validators/excel-schema.validator');
const { processRowData } = require('../../transformers/row.transformer');

async function convert({ files, outputDir, batchName, maxPartSizeBytes, onValidated, onProgress }) {
  const schema = validateSameSchema(files);
  if (onValidated) await onValidated(schema);
  const writer = new JsonlPartWriter({ outputDir, baseName: batchName, maxPartSizeBytes });
  let processedFiles = 0;

  for (const file of files) {
    const { rows } = readRows(file.path);
    for (const row of rows) {
      await writer.writeObject(processRowData(row));
    }
    processedFiles += 1;
    if (onProgress) {
      await onProgress({
        processedFiles,
        totalFiles: files.length,
        progressPercent: Math.round((processedFiles / files.length) * 100),
      });
    }
  }

  const result = await writer.close();
  return {
    schema,
    files: result.files,
    totalRecords: result.totalRecords,
  };
}

module.exports = {
  key: 'XLSX:JSONL',
  sourceFormats: ['XLS', 'XLSX'],
  targetFormat: 'JSONL',
  convert,
};
