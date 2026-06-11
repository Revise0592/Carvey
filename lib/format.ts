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
