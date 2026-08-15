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
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
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

module.exports = { fmtMoney, fmtDate, fmtDateLong, todayISO, addDaysISO, weekBounds, round2 };
