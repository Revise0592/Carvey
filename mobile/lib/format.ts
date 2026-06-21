export function formatCurrency(
  value: number | null | undefined,
  settings?: { currency?: "GBP" | "USD" | "EUR" }
): string {
  const currency = settings?.currency ?? "GBP";
  const amount = value ?? 0;
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  if (currency === "EUR") {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount);
  }
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export function formatMiles(
  value: number | null | undefined,
  settings?: { distanceUnit?: "miles" | "km" }
): string {
  if (value === null || value === undefined) {
    return settings?.distanceUnit === "km" ? "No distance" : "No mileage";
  }
  const formatted = new Intl.NumberFormat("en-GB").format(value);
  return settings?.distanceUnit === "km" ? `${formatted} km` : `${formatted} miles`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(
  value: string | null | undefined,
  settings?: { dateFormat?: "dd-mon-yyyy" | "iso" }
): string {
  if (!value) return "Not set";
  const iso = value.slice(0, 10);
  if (settings?.dateFormat === "iso") return iso;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return iso;
  return `${parts[2]} ${MONTHS_SHORT[monthIdx]} ${parts[0]}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export type MotResult = "pass" | "fail" | "advisory";
export type ReminderStatusLabel = "done" | "overdue" | "upcoming" | "open";
export type PlannedPurchaseStatus =
  | "to-buy"
  | "purchased"
  | "logged-as-maintenance"
  | "logged-as-repair";

export function formatMotResult(value: MotResult): string {
  const labels: Record<MotResult, string> = {
    pass: "Pass",
    fail: "Fail",
    advisory: "Pass with Advisories",
  };
  return labels[value];
}

export function formatReminderStatus(value: ReminderStatusLabel): string {
  const labels: Record<ReminderStatusLabel, string> = {
    done: "Done",
    overdue: "Overdue",
    upcoming: "Upcoming",
    open: "Open",
  };
  return labels[value];
}

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
