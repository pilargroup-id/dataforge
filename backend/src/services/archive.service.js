const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function createZip({ zipPath, files, manifest, timeoutMs = 10 * 60 * 1000 }) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    const timer = setTimeout(() => {
      const err = new Error(`ZIP creation exceeded timeout ${timeoutMs} ms`);
      err.code = 'ARCHIVE_TIMEOUT';
      try { archive.abort(); } catch (_) { /* ignore abort failure */ }
      try { output.destroy(); } catch (_) { /* ignore destroy failure */ }
      finish(err);
    }, timeoutMs);
    timer.unref?.();

    output.on('close', () => finish(null, { sizeBytes: archive.pointer() }));
    output.on('error', (err) => finish(err));
    archive.on('error', (err) => finish(err));

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.file_path, {
        name: file.archive_name || path.basename(file.file_path),
      });
    }

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    const finalizeResult = archive.finalize();
    if (finalizeResult && typeof finalizeResult.catch === 'function') {
      finalizeResult.catch((err) => finish(err));
    }
  });
}

module.exports = { createZip };
