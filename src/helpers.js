function fmtMoney(n) {
  const v = Number(n || 0);
  const neg = v < 0;
  const s = Math.abs(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-$' : '$') + s;
}

function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  const s = String(d);
  return new Date(s.includes('T') ? s : s.replace(' ', 'T'));
}

function fmtDate(d) {
  if (!d) return '';
  const dt = parseDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return String(d);
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
}

function fmtDateLong(d) {
  if (!d) return '';
  const dt = parseDate(d);
  if (!dt || Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekBounds() {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { start: iso(monday), end: iso(sunday) };
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function formatWeekRangeForEmail(items) {
  if (!items || items.length === 0) return '';
  const details = items[0].details;
  if (!details || details.length === 0) return '';

  const firstDetail = details[0];
  const lastDetail = details[details.length - 1];

  // Extract components from "Mon - 7th 07/09/2026 - Full day - $180"
  const parts = firstDetail.split(' - ');
  const firstDay = parts[0];
  const firstDayNum = parts[1];
  const firstDate = parts[2];

  const lastParts = lastDetail.split(' - ');
  const lastDay = lastParts[0];
  const lastDayNum = lastParts[1];
  const lastDate = lastParts[2];

  if (!firstDay || !firstDayNum || !firstDate || !lastDay || !lastDayNum || !lastDate) {
    return '';
  }

  return `${firstDay} - ${firstDayNum} ${firstDate} to ${lastDay} - ${lastDayNum} ${lastDate}`;
}

module.exports = { fmtMoney, fmtDate, fmtDateLong, todayISO, addDaysISO, weekBounds, round2, formatWeekRangeForEmail };
