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
      purchasePrice: 9000,
      purchaseDate: "2024-06-01",
      notes: null
    });
    const vehicleId = Number(vehicle.lastInsertRowid);
    expect(db.getVehicle(vehicleId)).toMatchObject({ purchasePrice: 9000, purchaseDate: "2024-06-01" });
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

  it("updates vehicle profile details", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "Toyota",
      model: "Corolla",
      year: 2019,
      registration: "TO19 OTA",
      vin: null,
      currentOdometer: 20000,
      purchasePrice: 12000,
      purchaseDate: "2024-01-01",
      notes: "Original note"
    }).lastInsertRowid);

    db.updateVehicle(vehicleId, {
      make: "Toyota",
      model: "Corolla Touring",
      year: 2020,
      registration: "TO20 OTA",
      vin: "VIN123",
      currentOdometer: 25000,
      purchasePrice: 11500,
      purchaseDate: "2024-02-03",
      notes: "Corrected"
    });

    expect(db.getVehicle(vehicleId)).toMatchObject({
      model: "Corolla Touring",
      registration: "TO20 OTA",
      vin: "VIN123",
      currentOdometer: 25000,
      purchasePrice: 11500,
      purchaseDate: "2024-02-03",
      notes: "Corrected"
    });
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
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);

    const repairId = Number(db.createRepair({ vehicleId, date: "2026-01-01", odometer: null, fault: "Tyre", garage: null, cost: 10, notes: null }).lastInsertRowid);
    db.updateRepair(repairId, vehicleId, { date: "2026-01-02", odometer: 130100, fault: "Two tyres", garage: "Local garage", cost: 180, notes: "Front axle" });
    expect(db.listRepairs(vehicleId)[0].fault).toBe("Two tyres");

    const motId = Number(db.createMot({ vehicleId, testDate: "2026-02-01", expiryDate: "2027-02-01", odometer: null, result: "pass", advisories: null, cost: 54.85, certificateRef: null }).lastInsertRowid);
    db.updateMot(motId, vehicleId, { testDate: "2026-02-02", expiryDate: "2027-02-02", odometer: 130500, result: "advisory", advisories: "Brake pipe corrosion", cost: 54.85, certificateRef: "ABC123" });
    expect(db.listMots(vehicleId)[0]).toMatchObject({ result: "advisory", certificateRef: "ABC123" });

    db.upsertMotReminder(vehicleId, "2027-02-02");
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ title: "MOT due", dueDate: "2027-02-02", recurrence: "12 months" });
    db.upsertMotReminder(vehicleId, "2027-03-03");
    expect(db.listReminders(vehicleId).filter((reminder) => reminder.title === "MOT due")).toHaveLength(1);
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ dueDate: "2027-03-03" });

    const reminderId = Number(db.createReminder({ vehicleId, title: "Service", dueDate: "2026-12-01", dueOdometer: null, recurrence: null }).lastInsertRowid);
    db.updateReminder(reminderId, vehicleId, { title: "Annual service", dueDate: "2026-12-02", dueOdometer: 140000, recurrence: "12 months", completedAt: null });
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ title: "Annual service", dueOdometer: 140000 });

    db.deleteRepair(repairId, vehicleId);
    db.deleteMot(motId, vehicleId);
    db.deleteReminder(reminderId, vehicleId);
    expect(db.listRepairs(vehicleId)).toHaveLength(0);
    expect(db.listMots(vehicleId)).toHaveLength(0);
    expect(db.listReminders(vehicleId)).toHaveLength(1);
    expect(db.listReminders(vehicleId)[0].title).toBe("MOT due");
    db.closeDbForTests();
  });
});
