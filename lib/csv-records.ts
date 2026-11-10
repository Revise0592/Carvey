import { addDays, addMonths, isIsoDate } from "./dates";
import { RENEWAL_TYPES, type RenewalType } from "./db/types";

/**
 * Column definitions shared by CSV export and import, so an exported file always imports back
 * cleanly. Import also accepts common header aliases used by other apps and spreadsheets.
 */

export const CSV_KINDS = ["maintenance", "repairs", "mots", "fuel", "renewals"] as const;
export type CsvKind = (typeof CSV_KINDS)[number];

export const csvKindLabels: Record<CsvKind, string> = {
  maintenance: "Maintenance",
  repairs: "Repairs",
  mots: "MOTs / inspections",
  fuel: "Fuel",
  renewals: "Renewals"
};

export type DateOrder = "dmy" | "mdy";

type FieldType = "date" | "int" | "number" | "text" | "bool";

type FieldDef = { key: string; header: string; type: FieldType; required?: boolean; aliases: string[] };

const odometerAliases = ["odometer", "mileage", "miles", "km", "kms", "kilometres", "kilometers", "odo", "odometerreading", "distance"];
const costAliases = ["cost", "price", "amount", "total", "totalcost", "totalprice", "paid"];
const notesAliases = ["notes", "note", "comments", "comment", "remarks", "details"];
const garageAliases = ["garage", "workshop", "garageworkshop", "shop", "mechanic", "vendor", "place", "location"];

export const csvFields: Record<CsvKind, FieldDef[]> = {
  maintenance: [
    { key: "date", header: "date", type: "date", required: true, aliases: ["date", "servicedate", "day", "when"] },
    { key: "odometer", header: "odometer", type: "int", aliases: odometerAliases },
    { key: "category", header: "category", type: "text", aliases: ["category", "type", "servicetype", "group"] },
    { key: "description", header: "description", type: "text", required: true, aliases: ["description", "service", "title", "work", "item", "name", "job"] },
    { key: "cost", header: "cost", type: "number", aliases: costAliases },
    { key: "garage", header: "garage", type: "text", aliases: garageAliases },
    { key: "notes", header: "notes", type: "text", aliases: notesAliases }
  ],
  repairs: [
    { key: "date", header: "date", type: "date", required: true, aliases: ["date", "repairdate", "day", "when"] },
    { key: "odometer", header: "odometer", type: "int", aliases: odometerAliases },
    { key: "fault", header: "fault", type: "text", required: true, aliases: ["fault", "repair", "description", "title", "work", "issue", "problem"] },
    { key: "garage", header: "garage", type: "text", aliases: garageAliases },
    { key: "cost", header: "cost", type: "number", aliases: costAliases },
    { key: "notes", header: "notes", type: "text", aliases: notesAliases }
  ],
  mots: [
    { key: "testDate", header: "test_date", type: "date", required: true, aliases: ["testdate", "date", "tested", "motdate", "inspectiondate"] },
    { key: "expiryDate", header: "expiry_date", type: "date", aliases: ["expirydate", "expiry", "expires", "validuntil", "duedate"] },
    { key: "odometer", header: "odometer", type: "int", aliases: odometerAliases },
    { key: "result", header: "result", type: "text", aliases: ["result", "outcome", "status"] },
    { key: "advisories", header: "advisories", type: "text", aliases: ["advisories", "advisory", "defects", "notes"] },
    { key: "cost", header: "cost", type: "number", aliases: costAliases },
    { key: "certificateRef", header: "certificate_ref", type: "text", aliases: ["certificateref", "certificate", "reference", "testnumber", "ref"] }
  ],
  fuel: [
    { key: "date", header: "date", type: "date", required: true, aliases: ["date", "filldate", "day", "when"] },
    { key: "odometer", header: "odometer", type: "int", required: true, aliases: odometerAliases },
    { key: "volume", header: "volume", type: "number", required: true, aliases: ["volume", "litres", "liters", "gallons", "quantity", "fuelamount", "fuelvolume", "amountfuel", "l", "gal"] },
    { key: "totalCost", header: "total_cost", type: "number", aliases: ["totalcost", ...costAliases] },
    { key: "fuelType", header: "fuel_type", type: "text", aliases: ["fueltype", "fuel", "grade"] },
    { key: "fullTank", header: "full_tank", type: "bool", aliases: ["fulltank", "full", "filled", "fullfill", "partial"] },
    { key: "station", header: "station", type: "text", aliases: ["station", "location", "place", "vendor", "brand"] },
    { key: "notes", header: "notes", type: "text", aliases: notesAliases }
  ],
  renewals: [
    { key: "type", header: "type", type: "text", required: true, aliases: ["type", "kind", "category"] },
    { key: "provider", header: "provider", type: "text", aliases: ["provider", "insurer", "company", "vendor"] },
    { key: "reference", header: "reference", type: "text", aliases: ["reference", "policy", "policynumber", "ref", "number"] },
    { key: "startDate", header: "start_date", type: "date", aliases: ["startdate", "start", "from", "validfrom"] },
    { key: "endDate", header: "end_date", type: "date", required: true, aliases: ["enddate", "end", "to", "expiry", "expirydate", "renewaldate", "validuntil"] },
    { key: "cost", header: "cost", type: "number", aliases: costAliases },
    { key: "notes", header: "notes", type: "text", aliases: notesAliases }
  ]
};

export const registrationAliases = ["registration", "reg", "plate", "numberplate", "licenseplate", "licenceplate", "vehicle", "vrm"];

const normaliseHeader = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Maps each field to the index of its column, preferring exact header names over aliases. */
export function matchColumns(kind: CsvKind, header: string[]) {
  const normalised = header.map(normaliseHeader);
  const used = new Set<number>();
  const mapping: Record<string, number> = {};
  const fields = csvFields[kind];
  // Pass 1: canonical names. Pass 2: aliases in priority order.
  for (const field of fields) {
    const index = normalised.indexOf(normaliseHeader(field.header));
    if (index !== -1 && !used.has(index)) {
      mapping[field.key] = index;
      used.add(index);
    }
  }
  for (const field of fields) {
    if (field.key in mapping) continue;
    for (const alias of field.aliases) {
      const index = normalised.findIndex((name, i) => name === alias && !used.has(i));
      if (index !== -1) {
        mapping[field.key] = index;
        used.add(index);
        break;
      }
    }
  }
  const registration = normalised.findIndex((name, i) => registrationAliases.includes(name) && !used.has(i));
  return { mapping, registrationIndex: registration === -1 ? null : registration };
}

const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isoFrom(year: number, month: number, day: number) {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isIsoDate(iso) ? iso : null;
}

function fullYear(year: string) {
  const n = Number(year);
  if (year.length > 2) return n;
  return n < 70 ? 2000 + n : 1900 + n;
}

export function parseDateValue(raw: string, order: DateOrder = "dmy"): string | null {
  const value = raw.trim();
  if (!value) return null;
  let m = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (m) return isoFrom(Number(m[1]), Number(m[2]), Number(m[3]));
  m = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s.*)?$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    const [day, month] = order === "mdy" ? [b, a] : [a, b];
    return isoFrom(fullYear(m[3]), month, day);
  }
  m = value.match(/^(\d{1,2})[\s-]+([a-z]{3,})\.?[\s-,]+(\d{2}|\d{4})$/i);
  if (m) {
    const month = monthNames.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    return month ? isoFrom(fullYear(m[3]), month, Number(m[1])) : null;
  }
  m = value.match(/^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i);
  if (m) {
    const month = monthNames.indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    return month ? isoFrom(Number(m[3]), month, Number(m[2])) : null;
  }
  return null;
}

/** Parses "£1,234.50", "1.234,50", "12,5" and "-" style values. Returns null for blanks. */
export function parseNumberValue(raw: string): number | null {
  let value = raw.trim().replace(/[^\d.,-]/g, "");
  if (!value || value === "-") return null;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(value)) value = value.replace(/,/g, "");
  else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(value)) value = value.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(value)) value = value.replace(",", ".");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolValue(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (["1", "true", "yes", "y", "full", "x", "✓"].includes(value)) return true;
  if (["0", "false", "no", "n", "partial"].includes(value)) return false;
  return null;
}

function cleanText(raw: string) {
  // Undo the formula-guard apostrophe our own export adds.
  const value = raw.trim().replace(/^'(?=[=+\-@])/, "");
  return value.length ? value : null;
}

export function normaliseMotResult(raw: string | null): "pass" | "fail" | "advisory" | null {
  if (!raw) return "pass";
  const value = raw.toLowerCase();
  if (value.includes("advis")) return "advisory";
  if (value.includes("fail") || value.includes("refus")) return "fail";
  if (value.includes("pass") || value === "ok") return "pass";
  return null;
}

export function normaliseRenewalType(raw: string | null): RenewalType {
  const value = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if ((RENEWAL_TYPES as readonly string[]).includes(value)) return value as RenewalType;
  if (value.includes("insur")) return "insurance";
  if (value.includes("tax") || value === "ved") return "road-tax";
  if (value.includes("warrant")) return "warranty";
  if (value.includes("breakdown") || value.includes("recovery") || value.includes("rescue")) return "breakdown";
  return "other";
}

export function normaliseFuelType(raw: string | null) {
  const value = (raw ?? "").toLowerCase();
  if (!value || /petrol|gasoline|unleaded|super|e10|e5|regular|premium/.test(value)) return "petrol";
  if (value.includes("diesel")) return "diesel";
  if (value.includes("lpg") || value.includes("autogas")) return "lpg";
  return "other";
}

export type ParsedRow = { line: number; registration: string | null; values: Record<string, string | number | boolean | null> };
export type RowError = { line: number; message: string };

/**
 * Turns CSV text into typed rows for one record kind. Rows with problems are reported, not
 * dropped silently, so the preview can show exactly what will and won't be imported.
 */
export function parseRecordsCsv(kind: CsvKind, rows: string[][], options: { dateOrder: DateOrder }) {
  const [header, ...body] = rows;
  if (!header) return { rows: [] as ParsedRow[], errors: [{ line: 1, message: "The file is empty." }] as RowError[], mapping: {}, registrationIndex: null as number | null, missing: [] as string[] };
  const { mapping, registrationIndex } = matchColumns(kind, header);
  const fields = csvFields[kind];
  const missing = fields.filter((field) => field.required && !(field.key in mapping)).map((field) => field.header);
  if (missing.length) {
    return { rows: [], errors: [{ line: 1, message: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.` }], mapping, registrationIndex, missing };
  }

  const parsed: ParsedRow[] = [];
  const errors: RowError[] = [];
  body.forEach((cells, index) => {
    const line = index + 2;
    const values: ParsedRow["values"] = {};
    const problems: string[] = [];
    for (const field of fields) {
      const column = mapping[field.key];
      const raw = column === undefined ? "" : (cells[column] ?? "");
      let value: string | number | boolean | null;
      if (field.type === "date") {
        value = parseDateValue(raw, options.dateOrder);
        if (raw.trim() && !value) problems.push(`"${raw.trim()}" is not a date`);
      } else if (field.type === "int" || field.type === "number") {
        value = parseNumberValue(raw);
        if (raw.trim() && value === null) problems.push(`"${raw.trim()}" is not a number in ${field.header}`);
        if (value !== null && value < 0) problems.push(`${field.header} can't be negative`);
        if (value !== null && field.type === "int") value = Math.round(value);
      } else if (field.type === "bool") {
        value = parseBoolValue(raw);
        if (field.key === "fullTank" && header[column ?? -1] && normaliseHeader(header[column!]) === "partial" && value !== null) value = !value;
      } else {
        value = cleanText(raw);
      }
      if (field.required && !raw.trim()) problems.push(`${field.header} is required`);
      values[field.key] = value;
    }
    if (kind === "mots") {
      const result = normaliseMotResult(values.result as string | null);
      if (!result) problems.push(`"${values.result}" is not a pass, fail or advisory result`);
      values.result = result;
      if (!values.expiryDate && values.testDate) values.expiryDate = addDays(addMonths(values.testDate as string, 12), -1);
    }
    if (kind === "renewals") values.type = normaliseRenewalType(values.type as string | null);
    if (kind === "fuel") {
      values.fuelType = normaliseFuelType(values.fuelType as string | null);
      if (values.fullTank === null) values.fullTank = true;
      if (values.volume === 0) problems.push("volume must be more than zero");
    }
    if (kind === "maintenance" && !values.category) values.category = "Imported";
    const registration = registrationIndex === null ? null : cleanText(cells[registrationIndex] ?? "");
    if (problems.length) errors.push({ line, message: problems.join("; ") });
    else parsed.push({ line, registration, values });
  });
  return { rows: parsed, errors, mapping, registrationIndex, missing };
}
