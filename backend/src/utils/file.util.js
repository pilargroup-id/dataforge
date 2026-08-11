const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function removeDir(dirPath) {
  if (!dirPath) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function sanitizeFileName(value, fallback = 'dataforge') {
  const cleaned = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || fallback;
}

function extensionOf(fileName) {
  return path.extname(fileName || '').toLowerCase();
}

function isExcelFile(fileName) {
  return ['.xls', '.xlsx'].includes(extensionOf(fileName));
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];

  const result = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else result.push(fullPath);
    }
  }

  return result;
}

module.exports = {
  ensureDir,
  removeDir,
  sanitizeFileName,
  extensionOf,
  isExcelFile,
  listFilesRecursive,
};
