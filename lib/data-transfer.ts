import AdmZip from "adm-zip";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { toCsv, parseCsv } from "./csv";
import { csvFields, csvKindLabels, parseRecordsCsv, CSV_KINDS, type CsvKind, type DateOrder, type ParsedRow, type RowError } from "./csv-records";
import {
  createFuelRecord,
  createMaintenance,
  createMot,
  createRenewal,
  createRepair,
  findVehicleByRegistration,
  getDb,
  getOrCreateWorkshopByName,
  getVehicle,
  listFuelRecords,
  listMaintenance,
  listMots,
  listReminders,
  listRenewals,
  listRepairs,
  listVehicles,
  upsertMotReminder,
  type Vehicle
} from "./db";
import { ensureDataDirs, tempDir } from "./paths";
import { getMotLabel, getRegionalSettings, type RegionalSettings } from "./regional-settings";

const litresPerGallon = 3.78541;
const maxImportBytes = 10 * 1024 * 1024;
const importDir = () => path.join(tempDir, "csv-import");

// ─── Export ─────────────────────────────────────────────────────────────────

function rowsFor(kind: CsvKind, vehicle: Vehicle, settings: RegionalSettings): unknown[][] {
  const reg = vehicle.registration;
  switch (kind) {
    case "maintenance":
      return listMaintenance(vehicle.id).map((r) => [reg, r.date, r.odometer, r.category, r.description, r.cost, r.garage, r.notes]);
    case "repairs":
      return listRepairs(vehicle.id).map((r) => [reg, r.date, r.odometer, r.fault, r.garage, r.cost, r.notes]);
    case "mots":
      return listMots(vehicle.id).map((r) => [reg, r.testDate, r.expiryDate, r.odometer, r.result, r.advisories, r.cost, r.certificateRef]);
    case "fuel":
      return listFuelRecords(vehicle.id).map((r) => [
        reg, r.date, r.odometer,
        Number((settings.fuelVolumeUnit === "gallons" ? r.volumeLitres / litresPerGallon : r.volumeLitres).toFixed(3)),
        r.totalCost, r.fuelType, r.fullTank ? "yes" : "no", r.station, r.notes
      ]);
    case "renewals":
      return listRenewals(vehicle.id).map((r) => [reg, r.type, r.provider, r.reference, r.startDate, r.endDate, r.cost, r.notes]);
  }
}

function headerFor(kind: CsvKind) {
  return ["registration", ...csvFields[kind].map((field) => field.header)];
}

function exportVehicles(vehicleId: number | null) {
  return vehicleId === null ? listVehicles() : [getVehicle(vehicleId)].filter((v): v is Vehicle => Boolean(v));
}

export function exportCsv(kind: CsvKind, vehicleId: number | null) {
  const settings = getRegionalSettings();
  const rows = exportVehicles(vehicleId).flatMap((vehicle) => rowsFor(kind, vehicle, settings));
  return toCsv(headerFor(kind), rows);
}

/** Every record type as its own CSV, plus vehicles and reminders, in one zip. */
export function exportAllZip() {
  const settings = getRegionalSettings();
  const vehicles = listVehicles();
  const zip = new AdmZip();
  zip.addFile("vehicles.csv", Buffer.from(toCsv(
    ["registration", "make", "model", "year", "vin", "odometer", "purchase_price", "purchase_date", "sold", "notes"],
    vehicles.map((v) => [v.registration, v.make, v.model, v.year, v.vin, v.effectiveOdometer, v.purchasePrice, v.purchaseDate, v.sold ? "yes" : "no", v.notes])
  )));
  for (const kind of CSV_KINDS) {
    zip.addFile(`${kind}.csv`, Buffer.from(toCsv(headerFor(kind), vehicles.flatMap((vehicle) => rowsFor(kind, vehicle, settings)))));
  }
  zip.addFile("reminders.csv", Buffer.from(toCsv(
    ["registration", "title", "due_date", "due_odometer", "recurrence", "completed_at"],
    vehicles.flatMap((v) => listReminders(v.id).map((r) => [v.registration, r.title, r.dueDate, r.dueOdometer, r.recurrence, r.completedAt]))
  )));
  return zip.toBuffer();
}

// ─── Import ─────────────────────────────────────────────────────────────────

export type ImportTarget = { mode: "vehicle"; vehicleId: number } | { mode: "registration" };

type StagedRow = ParsedRow & { vehicleId: number; duplicate: boolean };

export type ImportPreview = {
  token: string;
  kind: CsvKind;
  fileName: string;
  target: ImportTarget;
  dateOrder: DateOrder;
  rows: StagedRow[];
  errors: RowError[];
  columns: Array<{ field: string; column: string | null }>;
  vehicleNames: Record<number, string>;
};

function duplicateKey(kind: CsvKind, values: Record<string, unknown>) {
  const money = (value: unknown) => (typeof value === "number" ? value.toFixed(2) : "0.00");
  switch (kind) {
    case "maintenance": return `${values.date}|${String(values.description).toLowerCase()}|${money(values.cost)}`;
    case "repairs": return `${values.date}|${String(values.fault).toLowerCase()}|${money(values.cost)}`;
    case "mots": return `${values.testDate}|${values.expiryDate}`;
    case "fuel": return `${values.date}|${values.odometer}`;
    case "renewals": return `${values.type}|${values.endDate}`;
  }
}

function existingKeys(kind: CsvKind, vehicleId: number) {
  const settings = getRegionalSettings();
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return new Set<string>();
  // rowsFor emits [registration, ...fields in csvFields order], so map columns back to field keys.
  return new Set(rowsFor(kind, vehicle, settings).map((row) =>
    duplicateKey(kind, Object.fromEntries(csvFields[kind].map((field, index) => [field.key, row[index + 1]])))
  ));
}

function isSafeToken(token: string) {
  return /^[a-f0-9-]{36}$/i.test(token);
}

export async function stageCsvImport(file: File, kind: CsvKind, target: ImportTarget, dateOrder: DateOrder): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  if (!file.size) return { ok: false, message: "Choose a CSV file to import." };
  if (file.size > maxImportBytes) return { ok: false, message: "CSV files must be smaller than 10 MB." };
  if (target.mode === "vehicle" && !getVehicle(target.vehicleId)) return { ok: false, message: "Choose a vehicle to import into." };

  const table = parseCsv(await file.text());
  const parsed = parseRecordsCsv(kind, table, { dateOrder });
  const errors = [...parsed.errors];
  const rows: StagedRow[] = [];
  const keyCache = new Map<number, Set<string>>();
  const vehicleNames: Record<number, string> = {};
  const seenInFile = new Set<string>();

  if (target.mode === "registration" && parsed.registrationIndex === null && !parsed.missing.length) {
    return { ok: false, message: "This file has no registration column. Pick a vehicle to import into instead." };
  }

  for (const row of parsed.rows) {
    let vehicle: Vehicle | undefined;
    if (target.mode === "vehicle") vehicle = getVehicle(target.vehicleId);
    else vehicle = row.registration ? findVehicleByRegistration(row.registration) : undefined;
    if (!vehicle) {
      errors.push({ line: row.line, message: row.registration ? `No vehicle with registration ${row.registration}` : "Registration is blank" });
      continue;
    }
    vehicleNames[vehicle.id] = `${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
    if (!keyCache.has(vehicle.id)) keyCache.set(vehicle.id, existingKeys(kind, vehicle.id));
    const key = `${vehicle.id}|${duplicateKey(kind, row.values)}`;
    const duplicate = keyCache.get(vehicle.id)!.has(duplicateKey(kind, row.values)) || seenInFile.has(key);
    seenInFile.add(key);
    rows.push({ ...row, vehicleId: vehicle.id, duplicate });
  }

  const header = table[0] ?? [];
  const preview: ImportPreview = {
    token: crypto.randomUUID(),
    kind,
    fileName: file.name,
    target,
    dateOrder,
    rows,
    errors: errors.sort((a, b) => a.line - b.line),
    columns: csvFields[kind].map((field) => ({ field: field.header, column: field.key in parsed.mapping ? header[(parsed.mapping as Record<string, number>)[field.key]] : null })),
    vehicleNames
  };
  ensureDataDirs();
  await fs.mkdir(importDir(), { recursive: true });
  await fs.writeFile(path.join(importDir(), `${preview.token}.json`), JSON.stringify(preview));
  return { ok: true, token: preview.token };
}

export async function readImportPreview(token: string | undefined): Promise<ImportPreview | null> {
  if (!token || !isSafeToken(token)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(importDir(), `${token}.json`), "utf8")) as ImportPreview;
  } catch {
    return null;
  }
}

export async function discardImport(token: string) {
  if (!isSafeToken(token)) return;
  await fs.rm(path.join(importDir(), `${token}.json`), { force: true });
}

/** Inserts the staged rows in one transaction. Duplicates are skipped unless `includeDuplicates`. */
export async function commitCsvImport(token: string, includeDuplicates = false) {
  const preview = await readImportPreview(token);
  if (!preview) return { ok: false as const, message: "This import preview has expired. Upload the file again." };
  const settings = getRegionalSettings();
  const rows = preview.rows.filter((row) => includeDuplicates || !row.duplicate);
  const touched = new Set<number>();

  const workshop = (name: unknown) => {
    if (typeof name !== "string" || !name) return { garage: null, workshopId: null };
    const found = getOrCreateWorkshopByName(name);
    return { garage: found.name, workshopId: found.id };
  };
  const num = (value: unknown) => (typeof value === "number" ? value : null);
  const text = (value: unknown) => (typeof value === "string" && value ? value : null);

  getDb().transaction(() => {
    for (const { vehicleId, values: v } of rows) {
      touched.add(vehicleId);
      switch (preview.kind) {
        case "maintenance":
          createMaintenance({ vehicleId, date: v.date as string, odometer: num(v.odometer), category: v.category as string, description: v.description as string, cost: num(v.cost) ?? 0, notes: text(v.notes), ...workshop(v.garage) });
          break;
        case "repairs":
          createRepair({ vehicleId, date: v.date as string, odometer: num(v.odometer), fault: v.fault as string, cost: num(v.cost) ?? 0, notes: text(v.notes), ...workshop(v.garage) });
          break;
        case "mots":
          createMot({ vehicleId, testDate: v.testDate as string, expiryDate: v.expiryDate as string, odometer: num(v.odometer), result: v.result as "pass" | "fail" | "advisory", advisories: text(v.advisories), cost: num(v.cost) ?? 0, certificateRef: text(v.certificateRef) });
          break;
        case "fuel": {
          const volume = num(v.volume) ?? 0;
          createFuelRecord({
            vehicleId,
            date: v.date as string,
            odometer: num(v.odometer) ?? 0,
            volumeLitres: settings.fuelVolumeUnit === "gallons" ? volume * litresPerGallon : volume,
            totalCost: num(v.totalCost),
            fuelType: v.fuelType as string,
            fullTank: v.fullTank === false ? 0 : 1,
            station: text(v.station),
            notes: text(v.notes)
          });
          break;
        }
        case "renewals":
          createRenewal({ vehicleId, type: v.type as never, provider: text(v.provider), reference: text(v.reference), startDate: text(v.startDate), endDate: v.endDate as string, cost: num(v.cost) ?? 0, notes: text(v.notes) });
          break;
      }
    }
    if (preview.kind === "mots" && settings.motFeature !== "disabled") {
      for (const vehicleId of touched) {
        const latest = listMots(vehicleId)[0];
        if (latest) upsertMotReminder(vehicleId, latest.expiryDate, getMotLabel(settings));
      }
    }
  })();

  await discardImport(token);
  return { ok: true as const, imported: rows.length, skipped: preview.rows.length - rows.length, vehicleIds: [...touched], kind: preview.kind, label: csvKindLabels[preview.kind] };
}
