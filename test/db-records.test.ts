import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshDb() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-db-"));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  return import("@/lib/db");
}

describe("record mutation helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("updates and deletes maintenance records scoped to a vehicle", async () => {
    const db = await freshDb();
    const vehicle = db.createVehicle({
      make: "Mazda",
      model: "MX-5",
      year: 2018,
      registration: "AB12 CDE",
      vin: null,
      currentOdometer: 42000,
      notes: null
    });
    const vehicleId = Number(vehicle.lastInsertRowid);
    const record = db.createMaintenance({
      vehicleId,
      date: "2026-04-01",
      odometer: 42000,
      category: "Oil",
      description: "Oil service",
      cost: 95,
      notes: null
    });

    db.updateMaintenance(Number(record.lastInsertRowid), vehicleId, {
      date: "2026-04-02",
      odometer: 42100,
      category: "Service",
      description: "Oil and filter",
      cost: 120,
      notes: "Corrected"
    });

    expect(db.listMaintenance(vehicleId)[0]).toMatchObject({
      date: "2026-04-02",
      category: "Service",
      description: "Oil and filter",
      cost: 120,
      notes: "Corrected"
    });

    db.deleteMaintenance(Number(record.lastInsertRowid), vehicleId);
    expect(db.listMaintenance(vehicleId)).toHaveLength(0);
    db.closeDbForTests();
  });

  it("updates and deletes repair, MOT, and reminder records", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "Volvo",
      model: "V70",
      year: 2010,
      registration: "V70 OLD",
      vin: null,
      currentOdometer: 130000,
      notes: null
    }).lastInsertRowid);

    const repairId = Number(db.createRepair({ vehicleId, date: "2026-01-01", odometer: null, fault: "Tyre", garage: null, cost: 10, notes: null }).lastInsertRowid);
    db.updateRepair(repairId, vehicleId, { date: "2026-01-02", odometer: 130100, fault: "Two tyres", garage: "Local garage", cost: 180, notes: "Front axle" });
    expect(db.listRepairs(vehicleId)[0].fault).toBe("Two tyres");

    const motId = Number(db.createMot({ vehicleId, testDate: "2026-02-01", expiryDate: "2027-02-01", odometer: null, result: "pass", advisories: null, cost: 54.85, certificateRef: null }).lastInsertRowid);
    db.updateMot(motId, vehicleId, { testDate: "2026-02-02", expiryDate: "2027-02-02", odometer: 130500, result: "advisory", advisories: "Brake pipe corrosion", cost: 54.85, certificateRef: "ABC123" });
    expect(db.listMots(vehicleId)[0]).toMatchObject({ result: "advisory", certificateRef: "ABC123" });

    const reminderId = Number(db.createReminder({ vehicleId, title: "Service", dueDate: "2026-12-01", dueOdometer: null, recurrence: null }).lastInsertRowid);
    db.updateReminder(reminderId, vehicleId, { title: "Annual service", dueDate: "2026-12-02", dueOdometer: 140000, recurrence: "12 months", completedAt: null });
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ title: "Annual service", dueOdometer: 140000 });

    db.deleteRepair(repairId, vehicleId);
    db.deleteMot(motId, vehicleId);
    db.deleteReminder(reminderId, vehicleId);
    expect(db.listRepairs(vehicleId)).toHaveLength(0);
    expect(db.listMots(vehicleId)).toHaveLength(0);
    expect(db.listReminders(vehicleId)).toHaveLength(0);
    db.closeDbForTests();
  });
});
