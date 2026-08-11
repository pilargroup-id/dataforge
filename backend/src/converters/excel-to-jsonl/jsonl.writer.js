const fs = require('fs');
const path = require('path');
const { once } = require('events');
const { ensureDir, sanitizeFileName } = require('../../utils/file.util');

class JsonlPartWriter {
  constructor({ outputDir, baseName, maxPartSizeBytes }) {
    this.outputDir = ensureDir(outputDir);
    this.baseName = sanitizeFileName(baseName);
    this.maxPartSizeBytes = maxPartSizeBytes;
    this.partNumber = 0;
    this.currentBytes = 0;
    this.currentStream = null;
    this.files = [];
    this.totalRecords = 0;
  }

  openNextPart() {
    this.partNumber += 1;
    this.currentBytes = 0;
    const fileName = `${this.baseName}_${String(this.partNumber).padStart(3, '0')}.jsonl`;
    const filePath = path.join(this.outputDir, fileName);
    this.currentStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
    this.files.push({ file_name: fileName, file_path: filePath, records: 0 });
  }

  async writeObject(value) {
    const line = `${JSON.stringify(value)}\n`;
    const lineBytes = Buffer.byteLength(line, 'utf8');

    if (!this.currentStream) this.openNextPart();
    if (this.currentBytes > 0 && this.currentBytes + lineBytes > this.maxPartSizeBytes) {
      await this.closeCurrentPart();
      this.openNextPart();
    }

    if (!this.currentStream.write(line)) {
      await once(this.currentStream, 'drain');
    }

    this.currentBytes += lineBytes;
    this.totalRecords += 1;
    this.files[this.files.length - 1].records += 1;
  }

  async closeCurrentPart() {
    if (!this.currentStream) return;
    const stream = this.currentStream;
    this.currentStream = null;
    stream.end();
    await once(stream, 'finish');
  }

  async close() {
    await this.closeCurrentPart();
    for (const file of this.files) {
      const stat = fs.statSync(file.file_path);
      file.size_bytes = stat.size;
    }
    return {
      files: this.files,
      totalRecords: this.totalRecords,
    };
  }
}

module.exports = { JsonlPartWriter };
