import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModules() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-seller-sheet-"));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  const db = await import("@/lib/db");
  const sellerSheet = await import("@/lib/seller-sheet");
  return { db, sellerSheet };
}

describe("seller sheet data", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("collects buyer-facing vehicle history without private purchase or photo fields", async () => {
    const { db, sellerSheet } = await freshModules();
    const vehicleId = Number(db.createVehicle({
      make: "Saab",
      model: "9-3",
      year: 2008,
      registration: "SA08 ABB",
      vin: "YS3TESTVIN",
      currentOdometer: 94400,
      purchasePrice: 2500,
      purchaseDate: "2023-04-01",
      notes: "Well kept."
    }).lastInsertRowid);

    db.setVehiclePhoto(vehicleId, "/uploads/vehicles/car.webp", "/uploads/vehicles/car-thumb.webp");
    db.createMaintenance({ vehicleId, date: "2026-01-01", odometer: 93000, category: "Service", description: "Oil service", cost: 120, notes: "Fully synthetic" });
    db.createRepair({ vehicleId, date: "2026-02-01", odometer: 94000, fault: "Exhaust bracket", garage: "Local garage", workshopId: null, cost: 80, notes: null });
    db.createMot({ vehicleId, testDate: "2026-03-01", expiryDate: "2027-03-01", odometer: 94400, result: "pass", advisories: null, cost: 54.85, certificateRef: "MOT123" });
    db.createReminder({ vehicleId, title: "MOT due", dueDate: "2027-03-01", dueOdometer: null, recurrence: "12 months" });
    const completedId = Number(db.createReminder({ vehicleId, title: "Completed service", dueDate: "2026-05-01", dueOdometer: null, recurrence: null }).lastInsertRowid);
    db.completeReminder(completedId, vehicleId);

    const report = sellerSheet.getSellerSheetData(vehicleId);
    expect(report).toBeTruthy();
    if (!report) throw new Error("report missing");

    expect(report.vehicle).toMatchObject({
      make: "Saab",
      model: "9-3",
      registration: "SA08 ABB",
      vin: "YS3TESTVIN",
      currentOdometer: 94400,
      notes: "Well kept."
    });
    expect("purchasePrice" in report.vehicle).toBe(false);
    expect("purchaseDate" in report.vehicle).toBe(false);
    expect("photoPath" in report.vehicle).toBe(false);
    expect("thumbnailPath" in report.vehicle).toBe(false);
    expect(report.maintenance).toHaveLength(1);
    expect(report.repairs).toHaveLength(1);
    expect(report.mots).toHaveLength(1);
    expect(report.reminders).toHaveLength(1);
    expect(report.reminders[0].title).toBe("MOT due");
    expect(report.totals).toMatchObject({
      maintenanceCount: 1,
      repairCount: 1,
      motCount: 1,
      openReminderCount: 1
    });
    expect(report.totals.loggedSpend).toBe(254.85);
    db.closeDbForTests();
  });

  it("returns null for missing vehicles", async () => {
    const { db, sellerSheet } = await freshModules();
    expect(sellerSheet.getSellerSheetData(999)).toBeNull();
    db.closeDbForTests();
  });
});
