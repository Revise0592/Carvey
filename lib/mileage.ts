import { addDays, daysBetween, todayIso } from "./dates";

export type Reading = { date: string; odometer: number };

export type MileageRate = {
  /** Average distance per day, in the vehicle's distance unit. */
  perDay: number;
  /** Date and value of the most recent reading the rate is anchored to. */
  lastDate: string;
  lastOdometer: number;
  /** How many readings the rate was fitted to. */
  sampleSize: number;
};

const recentWindowDays = 730;
const minimumSpanDays = 30;
const maximumForecastDays = 3650;

/**
 * Estimates how far a vehicle travels per day from its dated odometer readings, using a
 * least-squares fit so one odd reading doesn't swing the result. Readings from the last two
 * years are preferred so the rate tracks how the car is driven now. Returns null when there
 * isn't enough history (fewer than two readings, or less than a month between them).
 */
export function estimateMileageRate(readings: Reading[]): MileageRate | null {
  const byDate = new Map<string, number>();
  for (const reading of readings) {
    if (!Number.isFinite(reading.odometer) || reading.odometer < 0 || !reading.date) continue;
    const date = reading.date.slice(0, 10);
    byDate.set(date, Math.max(byDate.get(date) ?? 0, reading.odometer));
  }
  const sorted = [...byDate.entries()].map(([date, odometer]) => ({ date, odometer })).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;

  const last = sorted[sorted.length - 1];
  const recent = sorted.filter((reading) => daysBetween(reading.date, last.date) <= recentWindowDays);
  const sample = recent.length >= 2 && daysBetween(recent[0].date, last.date) >= minimumSpanDays ? recent : sorted;
  if (daysBetween(sample[0].date, last.date) < minimumSpanDays) return null;

  const origin = sample[0].date;
  const xs = sample.map((reading) => daysBetween(origin, reading.date));
  const ys = sample.map((reading) => reading.odometer);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let covariance = 0;
  let variance = 0;
  for (let i = 0; i < xs.length; i++) {
    covariance += (xs[i] - meanX) * (ys[i] - meanY);
    variance += (xs[i] - meanX) ** 2;
  }
  if (variance === 0) return null;
  const perDay = covariance / variance;
  if (!(perDay > 0)) return null;

  return {
    perDay,
    lastDate: last.date,
    lastOdometer: Math.max(...sample.map((reading) => reading.odometer)),
    sampleSize: sample.length
  };
}

/** Projected odometer reading for a date (today by default). */
export function estimateOdometerOn(rate: MileageRate, date = todayIso()) {
  return Math.round(rate.lastOdometer + rate.perDay * Math.max(0, daysBetween(rate.lastDate, date)));
}

/**
 * The date the vehicle is expected to reach `targetOdometer`. Can be in the past, meaning the
 * target has probably been passed since the last reading. Null when it's more than ten years out.
 */
export function estimateDateForOdometer(rate: MileageRate, targetOdometer: number) {
  const days = Math.ceil((targetOdometer - rate.lastOdometer) / rate.perDay);
  if (days > maximumForecastDays) return null;
  return addDays(rate.lastDate, days);
}

/** Average distance per year, rounded, for display. */
export function annualDistance(rate: MileageRate) {
  return Math.round((rate.perDay * 365.25) / 100) * 100;
}

export type ReminderTiming = {
  /** The date to sort and notify by: the due date, the estimated mileage date, or the earlier of both. */
  effectiveDate: string | null;
  /** Set when the mileage target drives the effective date. */
  estimatedDate: string | null;
  /** True when the estimate says the mileage target has probably already been reached. */
  probablyReached: boolean;
};

export function reminderTiming(
  reminder: { dueDate: string | null; dueOdometer: number | null },
  rate: MileageRate | null,
  today = todayIso()
): ReminderTiming {
  const estimatedDate = reminder.dueOdometer !== null && rate ? estimateDateForOdometer(rate, reminder.dueOdometer) : null;
  const useEstimate = estimatedDate !== null && (!reminder.dueDate || estimatedDate < reminder.dueDate);
  return {
    effectiveDate: useEstimate ? estimatedDate : reminder.dueDate,
    estimatedDate: useEstimate ? estimatedDate : null,
    probablyReached: useEstimate && estimatedDate! <= today
  };
}

/** Groups readings by vehicle and fits a rate for each. */
export function mileageRatesByVehicle(readings: Array<Reading & { vehicleId: number }>) {
  const grouped = new Map<number, Reading[]>();
  for (const reading of readings) {
    const list = grouped.get(reading.vehicleId);
    if (list) list.push(reading);
    else grouped.set(reading.vehicleId, [reading]);
  }
  const rates = new Map<number, MileageRate>();
  for (const [vehicleId, list] of grouped) {
    const rate = estimateMileageRate(list);
    if (rate) rates.set(vehicleId, rate);
  }
  return rates;
}
