const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { ensureDir, sanitizeFileName } = require('../../utils/file.util');

class JsonlPartWriter {
  constructor({ outputDir, baseName, maxPartSizeBytes, existingFiles = [] }) {
    this.outputDir = ensureDir(outputDir);
    this.baseName = sanitizeFileName(baseName);
    this.maxPartSizeBytes = maxPartSizeBytes;
    this.partNumber = 0;
    this.currentBytes = 0;
    this.currentStream = null;
    this.currentFile = null;
    this.files = [];
    this.totalRecords = 0;

    const normalizedExisting = [...existingFiles]
      .filter((file) => file && file.file_name && file.file_path && fs.existsSync(file.file_path))
      .sort((a, b) => String(a.file_name).localeCompare(String(b.file_name)));

    for (const file of normalizedExisting) {
      const stat = fs.statSync(file.file_path);
      const partMatch = String(file.file_name).match(/_(\d+)\.jsonl$/i);
      const partNumber = partMatch ? Number(partMatch[1]) : 0;
      this.partNumber = Math.max(this.partNumber, Number.isFinite(partNumber) ? partNumber : 0);

      const normalized = {
        file_name: file.file_name,
        file_path: file.file_path,
        records: Number(file.records || 0),
        size_bytes: Number(file.size_bytes || stat.size),
      };

      this.files.push(normalized);
      this.totalRecords += normalized.records;
    }
  }

  openNextPart() {
    this.partNumber += 1;
    this.currentBytes = 0;

    const fileName = `${this.baseName}_${String(this.partNumber).padStart(3, '0')}.jsonl`;
    const filePath = path.join(this.outputDir, fileName);

    this.currentFile = {
      file_name: fileName,
      file_path: filePath,
      records: 0,
      size_bytes: 0,
    };

    this.currentStream = fs.createWriteStream(filePath, {
      encoding: 'utf8',
      flags: 'w',
    });

    this.files.push(this.currentFile);
  }

  openExistingLastPartForAppend() {
    if (!this.files.length) return false;

    const last = this.files[this.files.length - 1];
    const stat = fs.statSync(last.file_path);

    if (stat.size >= this.maxPartSizeBytes) return false;

    this.currentBytes = stat.size;
    this.currentFile = last;
    this.currentStream = fs.createWriteStream(last.file_path, {
      encoding: 'utf8',
      flags: 'a',
    });

    return true;
  }

  ensureWritablePart() {
    if (this.currentStream) return;
    if (!this.openExistingLastPartForAppend()) this.openNextPart();
  }

  async writeObject(value) {
    const line = `${JSON.stringify(value)}\n`;
    const lineBytes = Buffer.byteLength(line, 'utf8');

    this.ensureWritablePart();

    if (
      this.currentBytes > 0 &&
      this.currentBytes + lineBytes > this.maxPartSizeBytes
    ) {
      await this.closeCurrentPart();
      this.openNextPart();
    }

    if (!this.currentStream.write(line)) {
      await once(this.currentStream, 'drain');
    }

    this.currentBytes += lineBytes;
    this.totalRecords += 1;
    this.currentFile.records += 1;
    this.currentFile.size_bytes = this.currentBytes;
  }

  async closeCurrentPart() {
    if (!this.currentStream) return;

    const stream = this.currentStream;
    const file = this.currentFile;

    this.currentStream = null;
    this.currentFile = null;

    stream.end();
    await once(stream, 'finish');

    if (file && fs.existsSync(file.file_path)) {
      file.size_bytes = fs.statSync(file.file_path).size;
    }

    this.currentBytes = 0;
  }

  async close() {
    await this.closeCurrentPart();

    for (const file of this.files) {
      if (fs.existsSync(file.file_path)) {
        file.size_bytes = fs.statSync(file.file_path).size;
      }
    }

    return {
      files: this.files,
      totalRecords: this.totalRecords,
    };
  }
}

module.exports = { JsonlPartWriter };
