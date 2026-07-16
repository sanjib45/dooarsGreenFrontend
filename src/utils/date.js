/**
 * Local calendar-date helpers.
 * Never use `toISOString().slice(0, 10)` for "today" — that is UTC and
 * shifts the calendar day for IST (UTC+5:30) users (wrong before ~5:30 AM,
 * and mismatches stored local business dates).
 */

/** YYYY-MM-DD in the user's local timezone */
export function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Value for <input type="datetime-local" /> — local wall time, no zone suffix.
 * Example: 2026-07-16T22:46
 */
export function localDatetimeValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Convert datetime-local string to a real UTC ISO string before sending to API.
 * Browsers parse "YYYY-MM-DDTHH:mm" as local; Node on a UTC server would treat
 * the raw string as UTC and shift the stored instant by +5:30 for India.
 */
export function toApiDate(value) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  // Already has zone (Z or ±hh:mm)
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value).toISOString();
  // datetime-local or date-only → interpret as local, emit UTC ISO
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
}

/**
 * Convert an API ISO timestamp into a datetime-local input value (local wall clock).
 */
export function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
  return localDatetimeValue(d);
}
