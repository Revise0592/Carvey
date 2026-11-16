/** Date helpers for ISO `YYYY-MM-DD` strings. Pure, so they are safe in client and server code. */

/**
 * Today's date on the local calendar (the container's TZ on the server, the device's in the
 * browser). Not UTC: the notification scheduler compares it with the local hour, and "overdue"
 * should flip at local midnight.
 */
export function todayIso(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Calendar arithmetic in UTC so the result never shifts a day with the local time zone. */
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  const ms = Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function daysUntil(isoDate: string, today = todayIso()) {
  return daysBetween(today, isoDate);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
