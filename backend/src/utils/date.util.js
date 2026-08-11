function parseTimeOnDate(date, hhmm) {
  const [hour, minute] = String(hhmm).split(':').map(Number);
  const result = new Date(date);
  result.setHours(hour || 0, minute || 0, 0, 0);
  return result;
}

function addHours(date, hours) {
  return new Date(date.getTime() + Number(hours) * 60 * 60 * 1000);
}

function calculateExpiry(completedAt, expiryHours, dailyCutoff) {
  const normalExpiry = addHours(completedAt, expiryHours);
  const cutoff = parseTimeOnDate(completedAt, dailyCutoff);
  return normalExpiry < cutoff ? normalExpiry : cutoff;
}

function isPastTimeToday(hhmm, now = new Date()) {
  return now >= parseTimeOnDate(now, hhmm);
}

function secondsUntil(date, now = new Date()) {
  return Math.max(0, Math.floor((date.getTime() - now.getTime()) / 1000));
}

module.exports = {
  parseTimeOnDate,
  addHours,
  calculateExpiry,
  isPastTimeToday,
  secondsUntil,
};
