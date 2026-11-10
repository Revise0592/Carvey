import AdmZip from "adm-zip";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModules() {
  process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-transfer-"));
  vi.resetModules();
  return { db: await import("@/lib/db"), transfer: await import("@/lib/data-transfer") };
}

const vehicleInput = (registration: string) => ({ make: "Honda", model: "Civic", year: 2018, registration, vin: null, currentOdometer: null, purchasePrice: null, purchaseDate: null, notes: null });
const csvFile = (text: string, name = "import.csv") => new File([text], name, { type: "text/csv" });

describe("CSV import and export", () => {
  beforeEach(() => vi.resetModules());

  it("previews, skips duplicates and imports into a chosen vehicle", async () => {
    const { db, transfer } = await freshModules();
    const vehicleId = Number(db.createVehicle(vehicleInput("AB12 CDE")).lastInsertRowid);
    db.createMaintenance({ vehicleId, date: "2025-06-01", odometer: 30000, category: "Service", description: "Oil change", cost: 89.5, notes: null });

    const staged = await transfer.stageCsvImport(csvFile([
      "Date,Mileage,Category,Description,Price,Garage",
      "01/06/2025,30000,Service,Oil change,£89.50,",
      "14/01/2026,34000,Brakes,Front pads,\"£1,120.00\",Smith Motors",
      "not a date,1,x,y,1,"
    ].join("\n")), "maintenance", { mode: "vehicle", vehicleId }, "dmy");
    if (!staged.ok) throw new Error(staged.message);

    const preview = await transfer.readImportPreview(staged.token);
    expect(preview?.rows.map((r) => [r.line, r.duplicate])).toEqual([[2, true], [3, false]]);
    expect(preview?.errors).toEqual([{ line: 4, message: '"not a date" is not a date' }]);
    expect(preview?.columns.find((c) => c.field === "cost")).toEqual({ field: "cost", column: "Price" });

    const result = await transfer.commitCsvImport(staged.token);
    expect(result).toMatchObject({ ok: true, imported: 1, skipped: 1 });
    const records = db.listMaintenance(vehicleId);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ date: "2026-01-14", odometer: 34000, description: "Front pads", cost: 1120, garage: "Smith Motors", workshopId: expect.any(Number) });
    expect(await transfer.readImportPreview(staged.token)).toBeNull();
    db.closeDbForTests();
  });

  it("matches rows to vehicles by registration and converts fuel units", async () => {
    const { db, transfer } = await freshModules();
    const first = Number(db.createVehicle(vehicleInput("AB12 CDE")).lastInsertRowid);
    const second = Number(db.createVehicle(vehicleInput("XY99ZZZ")).lastInsertRowid);
    db.setAppSetting("fuelVolumeUnit", "gallons");

    const staged = await transfer.stageCsvImport(csvFile([
      "registration,date,odometer,volume,total_cost,full_tank",
      "ab12cde,2026-01-01,1000,10,50,yes",
      "XY99 ZZZ,2026-01-02,2000,5,25,no",
      "NOPE,2026-01-03,3000,5,25,yes"
    ].join("\n")), "fuel", { mode: "registration" }, "dmy");
    if (!staged.ok) throw new Error(staged.message);
    const result = await transfer.commitCsvImport(staged.token);
    expect(result).toMatchObject({ ok: true, imported: 2 });
    expect(db.listFuelRecords(first)[0].volumeLitres).toBeCloseTo(37.8541, 3);
    expect(db.listFuelRecords(second)[0]).toMatchObject({ fullTank: 0, totalCost: 25 });
    db.closeDbForTests();
  });

  it("rejects registration matching when the file has no registration column", async () => {
    const { db, transfer } = await freshModules();
    db.createVehicle(vehicleInput("AB12 CDE"));
    const staged = await transfer.stageCsvImport(csvFile("date,description\n2026-01-01,Wipers"), "maintenance", { mode: "registration" }, "dmy");
    expect(staged).toMatchObject({ ok: false, message: expect.stringContaining("no registration column") });
    db.closeDbForTests();
  });

  it("imports MOTs and resets the MOT reminder to the latest expiry", async () => {
    const { db, transfer } = await freshModules();
    const vehicleId = Number(db.createVehicle(vehicleInput("AB12 CDE")).lastInsertRowid);
    const staged = await transfer.stageCsvImport(csvFile("test_date,expiry_date,result\n2024-05-01,2025-04-30,pass\n2025-05-01,2026-04-30,PASS WITH ADVISORIES"), "mots", { mode: "vehicle", vehicleId }, "dmy");
    if (!staged.ok) throw new Error(staged.message);
    await transfer.commitCsvImport(staged.token);
    expect(db.listMots(vehicleId).map((m) => m.result)).toEqual(["advisory", "pass"]);
    expect(db.listReminders(vehicleId)).toMatchObject([{ title: "MOT due", dueDate: "2026-04-30" }]);
    db.closeDbForTests();
  });

  it("exports CSV that imports back unchanged", async () => {
    const { db, transfer } = await freshModules();
    const source = Number(db.createVehicle(vehicleInput("AB12 CDE")).lastInsertRowid);
    db.createRepair({ vehicleId: source, date: "2026-02-03", odometer: 41000, fault: "Exhaust, rear box", garage: null, workshopId: null, cost: 180, notes: "=not a formula" });
    db.createRenewal({ vehicleId: source, type: "road-tax", provider: "DVLA", reference: null, startDate: "2026-03-01", endDate: "2027-02-28", cost: 195, notes: null });
    const repairs = transfer.exportCsv("repairs", source);
    expect(repairs.split("\r\n")[0]).toBe("registration,date,odometer,fault,garage,cost,notes");

    const target = Number(db.createVehicle(vehicleInput("NEW 1")).lastInsertRowid);
    for (const [kind, csv] of [["repairs", repairs], ["renewals", transfer.exportCsv("renewals", source)]] as const) {
      const staged = await transfer.stageCsvImport(csvFile(csv), kind, { mode: "vehicle", vehicleId: target }, "dmy");
      if (!staged.ok) throw new Error(staged.message);
      await transfer.commitCsvImport(staged.token);
    }
    expect(db.listRepairs(target)[0]).toMatchObject({ date: "2026-02-03", odometer: 41000, fault: "Exhaust, rear box", cost: 180, notes: "=not a formula" });
    expect(db.listRenewals(target)[0]).toMatchObject({ type: "road-tax", provider: "DVLA", endDate: "2027-02-28", cost: 195 });

    const zip = new AdmZip(transfer.exportAllZip());
    expect(zip.getEntries().map((e) => e.entryName).sort()).toEqual(["fuel.csv", "maintenance.csv", "mots.csv", "reminders.csv", "renewals.csv", "repairs.csv", "vehicles.csv"]);
    db.closeDbForTests();
  });
});
