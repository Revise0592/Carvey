export const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

export const numberFormatter = new Intl.NumberFormat("en-GB");

export function formatCurrency(value: number | null | undefined, settings?: { currency?: "GBP" | "USD" | "EUR" }) {
  const currency = settings?.currency ?? "GBP";
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value ?? 0);
  }
  return currencyFormatter.format(value ?? 0);
}

export function formatMiles(value: number | null | undefined, settings?: { distanceUnit?: "miles" | "km" }) {
  if (value === null || value === undefined) {
    return settings?.distanceUnit === "km" ? "No distance" : "No mileage";
  }
  if (settings?.distanceUnit === "km") {
    return `${numberFormatter.format(value)} km`;
  }
  return `${numberFormatter.format(value)} miles`;
}

export function formatDate(value: string | null | undefined, settings?: { dateFormat?: "dd-mon-yyyy" | "iso" }) {
  if (!value) return "Not set";
  if (settings?.dateFormat === "iso") {
    return value.slice(0, 10);
  }
  const dateValue = value.includes("T") || value.includes(" ") ? value : `${value}T12:00:00`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type MotResult = "pass" | "fail" | "advisory";
export type ReminderStatusLabel = "done" | "overdue" | "upcoming" | "open";
export type PlannedPurchaseStatus = "to-buy" | "purchased" | "logged-as-maintenance" | "logged-as-repair";

export function formatMotResult(value: MotResult) {
  const labels: Record<MotResult, string> = {
    pass: "Pass",
    fail: "Fail",
    advisory: "Pass with Advisories"
  };
  return labels[value];
}

export function formatReminderStatus(value: ReminderStatusLabel) {
  const labels: Record<ReminderStatusLabel, string> = {
    done: "Done",
    overdue: "Overdue",
    upcoming: "Upcoming",
    open: "Open"
  };
  return labels[value];
}

export function formatPlannedPurchaseStatus(value: PlannedPurchaseStatus) {
  const labels: Record<PlannedPurchaseStatus, string> = {
    "to-buy": "To Buy",
    purchased: "Purchased",
    "logged-as-maintenance": "Logged as Maintenance",
    "logged-as-repair": "Logged as Repair"
  };
  return labels[value];
}

// USD → US gallons; GBP/EUR → litres
export function getVolumeUnit(settings: { currency?: string }): "litres" | "gallons" {
  return settings.currency === "USD" ? "gallons" : "litres";
}

export function formatVolume(litres: number, settings: { currency?: string }): string {
  if (settings.currency === "USD") {
    return `${(litres / 3.78541).toFixed(2)} gal`;
  }
  return `${litres.toFixed(2)} L`;
}

export function formatFuelEconomy(
  distance: number,
  volumeLitres: number,
  settings: { distanceUnit?: string; currency?: string }
): string | null {
  if (!distance || !volumeLitres) return null;
  if (settings.distanceUnit === "km") {
    return `${((volumeLitres / distance) * 100).toFixed(1)} L/100km`;
  }
  if (settings.currency === "USD") {
    return `${(distance / (volumeLitres / 3.78541)).toFixed(1)} mpg`;
  }
  return `${(distance / (volumeLitres / 4.54609)).toFixed(1)} mpg`;
}

export function computeAverageFuelEconomy(
  records: Array<{ odometer: number; volumeLitres: number; fullTank: number }>,
  settings: { distanceUnit?: string; currency?: string }
): string | null {
  const sorted = [...records].sort((a, b) => a.odometer - b.odometer);
  const fullTanks = sorted.filter(r => r.fullTank);
  if (fullTanks.length < 2) return null;
  const first = fullTanks[0];
  const last = fullTanks[fullTanks.length - 1];
  const distance = last.odometer - first.odometer;
  const totalVolume = sorted
    .filter(r => r.odometer > first.odometer && r.odometer <= last.odometer)
    .reduce((sum, r) => sum + r.volumeLitres, 0);
  return formatFuelEconomy(distance, totalVolume, settings);
}

export function computeFuelEconomies(
  records: Array<{ id: number; odometer: number; volumeLitres: number; fullTank: number }>,
  settings: { distanceUnit?: string; currency?: string }
): Map<number, string> {
  const sorted = [...records].sort((a, b) => a.odometer - b.odometer);
  const result = new Map<number, string>();
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (!current.fullTank) continue;
    let prevFullIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (sorted[j].fullTank) { prevFullIdx = j; break; }
    }
    if (prevFullIdx === -1) continue;
    const prevFull = sorted[prevFullIdx];
    const distance = current.odometer - prevFull.odometer;
    const volume = sorted.slice(prevFullIdx + 1, i + 1).reduce((sum, r) => sum + r.volumeLitres, 0);
    const eco = formatFuelEconomy(distance, volume, settings);
    if (eco) result.set(current.id, eco);
  }
  return result;
}
