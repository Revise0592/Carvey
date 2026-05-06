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

  it("stores a custom collection name with a friendly default", async () => {
    const db = await freshDb();
    expect(db.getCollectionName()).toBe("My cars");

    db.updateCollectionName("The Fleet");

    expect(db.getCollectionName()).toBe("The Fleet");
    db.closeDbForTests();
  });

  it("manages workshops and preserves repair text when a workshop is deleted", async () => {
    const db = await freshDb();
    const preferredId = Number(db.createWorkshop({
      name: "Preferred Autos",
      address: "1 Workshop Road",
      phone: "01234 567890",
      email: "hello@example.com",
      website: "https://example.com",
      notes: "Knows the Honda well",
      preferred: true
    }).lastInsertRowid);
    const otherId = Number(db.createWorkshop({
      name: "Budget Tyres",
      address: null,
      phone: null,
      email: null,
      website: null,
      notes: null,
      preferred: false
    }).lastInsertRowid);

    expect(db.listWorkshops().map((workshop) => workshop.name)).toEqual(["Preferred Autos", "Budget Tyres"]);
    db.updateWorkshop(otherId, {
      name: "Aardvark Tyres",
      address: null,
      phone: null,
      email: null,
      website: null,
      notes: "Updated",
      preferred: true
    });
    expect(db.listWorkshops().map((workshop) => workshop.name)).toEqual(["Aardvark Tyres", "Preferred Autos"]);

    const vehicleId = Number(db.createVehicle({
      make: "Honda",
      model: "Jazz",
      year: 2020,
      registration: "HJ20 ABC",
      vin: null,
      currentOdometer: null,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    db.createRepair({
      vehicleId,
      date: "2026-01-01",
      odometer: null,
      fault: "Service",
      garage: "Preferred Autos",
      workshopId: preferredId,
      cost: 120,
      notes: null
    });
    expect(db.listRepairs(vehicleId)[0]).toMatchObject({ garage: "Preferred Autos", workshopId: preferredId });

    db.deleteWorkshop(preferredId);

    expect(db.listRepairs(vehicleId)[0]).toMatchObject({ garage: "Preferred Autos", workshopId: null });
    db.closeDbForTests();
  });

  it("getOrCreateWorkshopByName reuses existing workshop case-insensitively", async () => {
    const db = await freshDb();
    const first = db.getOrCreateWorkshopByName("Quick Lube");
    const second = db.getOrCreateWorkshopByName("quick lube");
    const third = db.getOrCreateWorkshopByName("QUICK LUBE");
    expect(second.id).toBe(first.id);
    expect(third.id).toBe(first.id);
    expect(db.listWorkshops()).toHaveLength(1);
    db.closeDbForTests();
  });

  it("getOrCreateWorkshopByName creates new workshop when no match", async () => {
    const db = await freshDb();
    const a = db.getOrCreateWorkshopByName("Garage A");
    const b = db.getOrCreateWorkshopByName("Garage B");
    expect(a.id).not.toBe(b.id);
    expect(db.listWorkshops()).toHaveLength(2);
    db.closeDbForTests();
  });

  it("getOrCreateWorkshopByName normalizes whitespace before matching and storing", async () => {
    const db = await freshDb();
    const w = db.getOrCreateWorkshopByName("  Bob's  Garage  ");
    expect(w.name).toBe("Bob's Garage");
    const again = db.getOrCreateWorkshopByName("Bob's  Garage");
    expect(again.id).toBe(w.id);
    expect(db.listWorkshops()).toHaveLength(1);
    db.closeDbForTests();
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
      notes: "Corrected",
      sold: false
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

  it("sets the hidden debug destroyed flag on vehicles", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "Citroen",
      model: "Saxo",
      year: 2002,
      registration: "SX02 DBG",
      vin: null,
      currentOdometer: 88000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);

    expect(db.getVehicle(vehicleId)?.debugDestroyed).toBe(0);
    db.setVehicleDebugDestroyed(vehicleId, true);
    expect(db.getVehicle(vehicleId)?.debugDestroyed).toBe(1);
    db.setVehicleDebugDestroyed(vehicleId, false);
    expect(db.getVehicle(vehicleId)?.debugDestroyed).toBe(0);
    db.closeDbForTests();
  });

  it("deletes a vehicle and its related records", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "Nissan",
      model: "Leaf",
      year: 2021,
      registration: "EV21 CAR",
      vin: null,
      currentOdometer: 18000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    db.createMaintenance({ vehicleId, date: "2026-01-01", odometer: 18000, category: "Tyres", description: "Rotate tyres", cost: 0, notes: null });
    db.createRepair({ vehicleId, date: "2026-01-02", odometer: 18001, fault: "Puncture", garage: null, workshopId: null, cost: 25, notes: null });
    db.createMot({ vehicleId, testDate: "2026-01-03", expiryDate: "2027-01-03", odometer: 18002, result: "pass", advisories: null, cost: 54.85, certificateRef: null });
    db.createReminder({ vehicleId, title: "Check coolant", dueDate: "2026-02-01", dueOdometer: null, recurrence: null });
    db.createPlannedPurchase({ vehicleId, itemName: "Oil filter", quantity: 1, estimatedCost: 12, supplier: null, url: null, dueDate: null, dueOdometer: null, notes: null });

    db.deleteVehicle(vehicleId);

    expect(db.getVehicle(vehicleId)).toBeUndefined();
    expect(db.listMaintenance(vehicleId)).toHaveLength(0);
    expect(db.listRepairs(vehicleId)).toHaveLength(0);
    expect(db.listMots(vehicleId)).toHaveLength(0);
    expect(db.listReminders(vehicleId)).toHaveLength(0);
    expect(db.listPlannedPurchases(vehicleId)).toHaveLength(0);
    db.closeDbForTests();
  });

  it("manages planned purchases and only counts bought items as spend", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "BMW",
      model: "330i",
      year: 2021,
      registration: "BM21 BUY",
      vin: null,
      currentOdometer: 30000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);

    const plannedId = Number(db.createPlannedPurchase({
      vehicleId,
      itemName: "Major service kit",
      quantity: 1,
      estimatedCost: 180,
      supplier: "Parts shop",
      url: "https://example.com/service-kit",
      dueDate: "2026-06-01",
      dueOdometer: 32000,
      notes: "Oil, plugs, filters"
    }).lastInsertRowid);

    expect(db.listPlannedPurchases(vehicleId)[0]).toMatchObject({
      itemName: "Major service kit",
      estimatedCost: 180,
      supplier: "Parts shop"
    });
    expect(db.getVehicleActivePlannedPurchaseSummary(vehicleId)).toMatchObject({ count: 1, estimatedTotal: 180 });
    expect(db.getVehicleLoggedSpend(vehicleId)).toBe(0);
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ title: "Buy: Major service kit", dueDate: "2026-06-01", dueOdometer: 32000 });

    db.updatePlannedPurchase(plannedId, vehicleId, {
      itemName: "Service parts bundle",
      quantity: 2,
      estimatedCost: 210,
      supplier: "Dealer",
      url: null,
      dueDate: "2026-06-10",
      dueOdometer: null,
      notes: "Updated"
    });
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ title: "Buy: Service parts bundle", dueDate: "2026-06-10", dueOdometer: null });

    const currentYear = new Date().getFullYear();
    db.markPlannedPurchaseBought(plannedId, vehicleId, { purchasedDate: `${currentYear}-05-01`, actualCost: 205 });
    expect(db.listPlannedPurchases(vehicleId)[0]).toMatchObject({ purchasedDate: `${currentYear}-05-01`, actualCost: 205 });
    expect(db.listReminders(vehicleId)[0].completedAt).toEqual(expect.any(String));
    expect(db.getVehicleActivePlannedPurchaseSummary(vehicleId)).toMatchObject({ count: 0, estimatedTotal: 0 });
    expect(db.getVehicleLoggedSpend(vehicleId)).toBe(205);

    db.createPlannedPurchase({
      vehicleId,
      itemName: "Coolant",
      quantity: 1,
      estimatedCost: 15,
      supplier: null,
      url: null,
      dueDate: "2026-05-20",
      dueOdometer: null,
      notes: null
    });
    expect(db.getDashboardStats().plannedPurchases[0]).toMatchObject({ itemName: "Coolant", estimatedCost: 15 });
    expect(db.getDashboardStats().yearlySpend).toBe(205);
    db.closeDbForTests();
  });

  it("clears and deletes linked reminders with planned purchases", async () => {
    const db = await freshDb();
    const vehicleId = Number(db.createVehicle({
      make: "Ford",
      model: "Focus",
      year: 2016,
      registration: "FD16 TODO",
      vin: null,
      currentOdometer: 76000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    const plannedId = Number(db.createPlannedPurchase({
      vehicleId,
      itemName: "Brake pads",
      quantity: 1,
      estimatedCost: 45,
      supplier: null,
      url: null,
      dueDate: "2026-07-01",
      dueOdometer: null,
      notes: null
    }).lastInsertRowid);
    expect(db.listReminders(vehicleId)).toHaveLength(1);

    db.updatePlannedPurchase(plannedId, vehicleId, {
      itemName: "Brake pads",
      quantity: 1,
      estimatedCost: 45,
      supplier: null,
      url: null,
      dueDate: null,
      dueOdometer: null,
      notes: null
    });
    expect(db.listPlannedPurchases(vehicleId)[0].reminderId).toBeNull();
    expect(db.listReminders(vehicleId)).toHaveLength(0);

    db.updatePlannedPurchase(plannedId, vehicleId, {
      itemName: "Brake pads",
      quantity: 1,
      estimatedCost: 45,
      supplier: null,
      url: null,
      dueDate: null,
      dueOdometer: 78000,
      notes: null
    });
    expect(db.listReminders(vehicleId)).toHaveLength(1);
    db.deletePlannedPurchase(plannedId, vehicleId);
    expect(db.listPlannedPurchases(vehicleId)).toHaveLength(0);
    expect(db.listReminders(vehicleId)).toHaveLength(0);
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

    const repairId = Number(db.createRepair({ vehicleId, date: "2026-01-01", odometer: null, fault: "Tyre", garage: null, workshopId: null, cost: 10, notes: null }).lastInsertRowid);
    db.updateRepair(repairId, vehicleId, { date: "2026-01-02", odometer: 130100, fault: "Two tyres", garage: "Local garage", workshopId: null, cost: 180, notes: "Front axle" });
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
