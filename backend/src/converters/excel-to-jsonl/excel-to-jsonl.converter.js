const path = require('path');
const { readRows } = require('./excel.reader');
const { JsonlPartWriter } = require('./jsonl.writer');
const { validateSameSchema } = require('../../validators/excel-schema.validator');
const { processRowData } = require('../../transformers/row.transformer');

function isControlError(err) {
  return err && (
    err.code === 'CONVERSION_PAUSED' ||
    err.code === 'CONVERSION_CANCELLED'
  );
}

async function persistPartialOutputs(writer, onOutput) {
  const result = await writer.close();
  if (onOutput) {
    for (const file of result.files) {
      await onOutput({
        ...file,
        archive_name: file.file_name,
      });
    }
  }
  return result;
}

async function convert({
  files,
  outputDir,
  batchName,
  maxPartSizeBytes,
  onValidated,
  onProgress,
  onOutput,
  resumeState = null,
  existingOutputs = [],
  checkpointIntervalRows = 100,
}) {
  const schema = validateSameSchema(files);
  if (onValidated) await onValidated(schema);

  const writer = new JsonlPartWriter({
    outputDir,
    baseName: batchName,
    maxPartSizeBytes,
    existingFiles: existingOutputs,
  });

  const nextFileIndex = Math.max(0, Number(resumeState?.next_file_index || 0));
  const nextRowIndex = Math.max(0, Number(resumeState?.next_row_index || 0));
  const checkpointEvery = Math.max(1, Number(checkpointIntervalRows) || 100);

  if (nextFileIndex > files.length) {
    const err = new Error('Checkpoint JSONL tidak valid: file index melebihi jumlah input file');
    err.code = 'RESUME_CHECKPOINT_INVALID';
    throw err;
  }

  try {
    for (let fileIndex = nextFileIndex; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex];
      const { rows } = readRows(file.path);
      const startRow = fileIndex === nextFileIndex ? nextRowIndex : 0;

      if (startRow > rows.length) {
        const err = new Error(`Checkpoint JSONL tidak valid untuk file ${file.originalname || path.basename(file.path)}`);
        err.code = 'RESUME_CHECKPOINT_INVALID';
        throw err;
      }

      if (!rows.length) {
        if (onProgress) {
          await onProgress({
            processedFiles: fileIndex + 1,
            totalFiles: files.length,
            progressPercent: Math.round(((fileIndex + 1) / files.length) * 100),
            checkpointData: {
              next_file_index: fileIndex + 1,
              next_row_index: 0,
              processed_records: writer.totalRecords,
              last_completed_file: file.originalname || path.basename(file.path),
            },
          });
        }
        continue;
      }

      for (let rowIndex = startRow; rowIndex < rows.length; rowIndex += 1) {
        await writer.writeObject(processRowData(rows[rowIndex]));

        const rowCompleted = rowIndex + 1;
        const fileCompleted = rowCompleted >= rows.length;
        const shouldCheckpoint =
          fileCompleted ||
          rowCompleted % checkpointEvery === 0;

        if (!shouldCheckpoint || !onProgress) continue;

        const nextPosition = fileCompleted
          ? { file: fileIndex + 1, row: 0 }
          : { file: fileIndex, row: rowCompleted };

        const fileFraction = rowCompleted / rows.length;
        const progressPercent = Math.min(
          100,
          Math.round(((fileIndex + fileFraction) / files.length) * 100)
        );

        await onProgress({
          processedFiles: fileCompleted ? fileIndex + 1 : fileIndex,
          totalFiles: files.length,
          progressPercent,
          checkpointData: {
            next_file_index: nextPosition.file,
            next_row_index: nextPosition.row,
            processed_records: writer.totalRecords,
            last_completed_file: file.originalname || path.basename(file.path),
            last_completed_row_index: rowIndex,
          },
        });
      }
    }
  } catch (err) {
    if (isControlError(err)) {
      if (err.code === 'CONVERSION_PAUSED') {
        await persistPartialOutputs(writer, onOutput);
      } else {
        await writer.close();
      }
    } else {
      await writer.close();
    }
    throw err;
  }

  const result = await writer.close();

  return {
    schema,
    files: result.files.map((file) => ({
      ...file,
      archive_name: file.file_name,
    })),
    totalRecords: result.totalRecords,
  };
}

module.exports = {
  key: 'XLSX:JSONL',
  sourceFormats: ['XLS', 'XLSX'],
  targetFormat: 'JSONL',
  permissionCode: 'XLSX_TO_JSONL',
  inputMode: 'batch',
  supportsPauseResume: true,
  convert,
};
