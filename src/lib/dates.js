export const pad2 = (value) => String(value).padStart(2, '0');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toDateInput(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value);
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDisplayDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseDateInput(value);
  }
  return new Date(value);
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function daysBetween(from, to) {
  if (!from || !to) return 0;
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

export function startOfWeekMonday(value = new Date()) {
  const date = startOfDay(value);
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

export function monthKey(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function monthLabel(key) {
  if (!key) return '—';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = toDisplayDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad2(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function ordinal(value) {
  const number = Number(value);
  if (!Number.isInteger(number)) return String(value);
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const remainder = number % 100;
  return `${number}${suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]}`;
}

export function formatWeekday(value) {
  const date = toDisplayDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return WEEKDAYS[date.getDay()];
}

export function formatShortDate(value) {
  const date = toDisplayDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad2(date.getDate())} ${MONTHS[date.getMonth()]}`;
}

export function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  let hours = date.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${pad2(hours)}:${pad2(date.getMinutes())} ${suffix}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function formatDateTimeInput(value = new Date()) {
  const date = new Date(value);
  return `${toDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(Number(ms)) || Number(ms) < 0) return '—';
  const totalMinutes = Math.floor(Number(ms) / 60000);
  if (totalMinutes < 1) return 'Under a minute';
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function durationBetween(startIso, endIso) {
  if (!startIso) return 0;
  const end = endIso ? new Date(endIso) : new Date();
  return Math.max(0, end.getTime() - new Date(startIso).getTime());
}

export function relativeDayLabel(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function timeAgo(value, now = new Date()) {
  if (!value) return '—';
  const minutes = Math.floor((now.getTime() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}

export function formatLiveClock(value = new Date()) {
  const date = new Date(value);
  return {
    date: `${WEEKDAYS[date.getDay()]}, ${pad2(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
  };
}

export { WEEKDAYS, MONTHS };
