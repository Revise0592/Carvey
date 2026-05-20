export const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP"
});

export const numberFormatter = new Intl.NumberFormat("en-GB");

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

export function formatMiles(value: number | null | undefined) {
  if (value === null || value === undefined) return "No mileage";
  return `${numberFormatter.format(value)} miles`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
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
