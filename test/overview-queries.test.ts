import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshDb() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-overview-"));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  return import("@/lib/db");
}

const currentYear = new Date().getFullYear();

async function seed() {
  const db = await freshDb();
  const vehicleInput = { year: 2010, vin: null, currentOdometer: 50000, purchasePrice: null, purchaseDate: null, notes: null };
  const civicId = Number(db.createVehicle({ make: "Honda", model: "Civic", registration: "AB12CDE", ...vehicleInput }).lastInsertRowid);
  const soldId = Number(db.createVehicle({ make: "Mazda", model: "MX-5", registration: "XY02ZZZ", ...vehicleInput }).lastInsertRowid);
  db.getDb().prepare("UPDATE vehicles SET sold = 1 WHERE id = ?").run(soldId);
  return { db, civicId, soldId };
}

describe("cross-vehicle overview queries", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists every costed record, including fuel, newest first", async () => {
    const { db, civicId } = await seed();
    db.createMaintenance({ vehicleId: civicId, date: `${currentYear}-02-01`, odometer: null, category: "Service", description: "Oil change", cost: 80, notes: null });
    db.createRepair({ vehicleId: civicId, date: `${currentYear}-03-01`, odometer: null, fault: "Brake pads", garage: null, workshopId: null, cost: 120, notes: null });
    db.createFuelRecord({ vehicleId: civicId, date: `${currentYear}-04-01`, odometer: 50100, volumeLitres: 40, totalCost: 60, fuelType: "petrol", fullTank: 1, station: "Esso", notes: null });
    db.createFuelRecord({ vehicleId: civicId, date: `${currentYear}-04-02`, odometer: 50200, volumeLitres: 10, totalCost: null, fuelType: "petrol", fullTank: 0, station: null, notes: null });

    const entries = db.listSpendEntries();
    expect(entries.map((e) => [e.type, e.label, e.cost])).toEqual([
      ["fuel", "Fuel · Esso", 60],
      ["repair", "Brake pads", 120],
      ["maintenance", "Oil change", 80]
    ]);
    expect(entries[0].vehicleName).toBe("Honda Civic");
    db.closeDbForTests();
  });

  it("counts fuel in the garage's yearly spend, matching per-vehicle totals", async () => {
    const { db, civicId } = await seed();
    db.createMaintenance({ vehicleId: civicId, date: `${currentYear}-02-01`, odometer: null, category: "Service", description: "Oil change", cost: 80, notes: null });
    db.createFuelRecord({ vehicleId: civicId, date: `${currentYear}-04-01`, odometer: 50100, volumeLitres: 40, totalCost: 60, fuelType: "petrol", fullTank: 1, station: null, notes: null });
    db.createFuelRecord({ vehicleId: civicId, date: `${currentYear - 1}-04-01`, odometer: 49000, volumeLitres: 40, totalCost: 55, fuelType: "petrol", fullTank: 1, station: null, notes: null });

    expect(db.getDashboardStats().yearlySpend).toBe(140);
    expect(db.getVehicleLoggedSpend(civicId)).toBe(195);
    db.closeDbForTests();
  });

  it("lists open reminders for unsold vehicles with dated ones first", async () => {
    const { db, civicId, soldId } = await seed();
    db.createReminder({ vehicleId: civicId, title: "Cambelt", dueDate: null, dueOdometer: 60000, recurrence: null });
    db.createReminder({ vehicleId: civicId, title: "Tax", dueDate: `${currentYear + 1}-01-01`, dueOdometer: null, recurrence: null });
    db.createReminder({ vehicleId: civicId, title: "Brakes", dueDate: `${currentYear}-01-01`, dueOdometer: null, recurrence: null });
    db.createReminder({ vehicleId: soldId, title: "Sold car job", dueDate: `${currentYear}-01-01`, dueOdometer: null, recurrence: null });

    const reminders = db.listOpenReminders();
    expect(reminders.map((r) => r.title)).toEqual(["Brakes", "Tax", "Cambelt"]);
    expect(reminders[0]).toMatchObject({ make: "Honda", model: "Civic", registration: "AB12CDE", currentOdometer: 50000 });
    db.closeDbForTests();
  });
});
