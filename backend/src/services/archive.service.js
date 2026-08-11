const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function createZip({ zipPath, files, manifest }) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve({ sizeBytes: archive.pointer() }));
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.file_path, { name: path.basename(file.file_path) });
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.finalize();
  });
}

module.exports = { createZip };
