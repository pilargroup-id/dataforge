const indonesianMonths = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agustus: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12,
};

function excelDateToJSDate(excelDate) {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
}

function isExcelDate(value) {
  return typeof value === 'number' && value > 1 && value < 2958466;
}

function detectTemporalType(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();

  const indonesia = /^(\d{1,2})\s+(\w+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/i;
  const timeOnly = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/;
  if (indonesia.test(trimmed)) return trimmed.match(indonesia)[4] ? 'datetime' : 'date';
  if (timeOnly.test(trimmed)) return 'time';

  const datetimePatterns = [
    /^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?/,
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?/,
  ];
  if (datetimePatterns.some((pattern) => pattern.test(trimmed))) return 'datetime';

  const datePatterns = [
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/,
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,
    /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,
  ];
  if (datePatterns.some((pattern) => pattern.test(trimmed))) return 'date';
  return null;
}

function convert2DigitYear(year) {
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const currentYearInCentury = currentYear % 100;
  return year <= currentYearInCentury ? currentCentury + year : currentCentury - 100 + year;
}

function parseIndonesianDate(value) {
  const pattern = /^(\d{1,2})\s+(\w+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/i;
  const match = String(value).match(pattern);
  if (!match) return null;

  const month = indonesianMonths[match[2].toLowerCase()];
  if (!month) return null;

  return new Date(
    Number(match[3]),
    month - 1,
    Number(match[1]),
    match[4] ? Number(match[4]) : 0,
    match[5] ? Number(match[5]) : 0,
    match[6] ? Number(match[6]) : 0
  );
}

function formatDate(dateObj, type) {
  const year = String(dateObj.getFullYear()).padStart(4, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  if (type === 'date') return `${year}-${month}-${day}`;
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function convertToStandardDate(value) {
  try {
    let dateObj;
    let formatType;

    if (isExcelDate(value)) {
      dateObj = excelDateToJSDate(value);
      formatType = 'datetime';
    } else if (value instanceof Date) {
      dateObj = value;
      formatType = 'datetime';
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      formatType = detectTemporalType(trimmed);
      if (!formatType) return value;

      if (formatType === 'time') {
        const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
        if (!match) return value;
        return `${String(Number(match[1])).padStart(2, '0')}:${String(Number(match[2])).padStart(2, '0')}:${String(match[3] ? Number(match[3]) : 0).padStart(2, '0')}`;
      }

      const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
      if (iso) {
        dateObj = new Date(
          Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]),
          iso[4] ? Number(iso[4]) : 0,
          iso[5] ? Number(iso[5]) : 0,
          iso[6] ? Number(iso[6]) : 0
        );
      } else {
        dateObj = parseIndonesianDate(trimmed);
      }

      if (!dateObj) {
        const timeMatch = trimmed.match(/(\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
        const datePart = timeMatch ? trimmed.replace(timeMatch[1], '').trim() : trimmed;
        const parts = datePart.split(/[\/\-.\s]/).filter(Boolean);
        if (parts.length >= 3) {
          const p1 = Number(parts[0]);
          const p2 = Number(parts[1]);
          let year = Number(parts[2]);
          if (year < 100) year = convert2DigitYear(year);

          let day;
          let month;
          if (String(parts[0]).length === 4) {
            year = p1;
            month = p2;
            day = Number(parts[2]);
          } else if (p1 > 12) {
            day = p1;
            month = p2;
          } else if (p2 > 12) {
            month = p1;
            day = p2;
          } else {
            month = p1;
            day = p2;
          }

          dateObj = new Date(year, month - 1, day);
          if (timeMatch) {
            const tm = timeMatch[1].split(':').map(Number);
            dateObj.setHours(tm[0] || 0, tm[1] || 0, tm[2] || 0, 0);
          }
        }
      }
    } else {
      return value;
    }

    if (!dateObj || Number.isNaN(dateObj.getTime())) return value;
    return formatDate(dateObj, formatType);
  } catch (_) {
    return value;
  }
}

module.exports = {
  excelDateToJSDate,
  isExcelDate,
  detectTemporalType,
  convert2DigitYear,
  parseIndonesianDate,
  convertToStandardDate,
};
