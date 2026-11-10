import Database from "better-sqlite3";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshDb() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-renewals-"));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  return { dir, db: await import("@/lib/db") };
}

const vehicle = { make: "Honda", model: "Civic", year: 2018, registration: "AB18 CDE", vin: null, currentOdometer: 40000, purchasePrice: null, purchaseDate: null, notes: null };
const policy = { type: "insurance" as const, provider: "Acme", reference: "P-1", startDate: "2026-02-01", endDate: "2027-01-31", cost: 420, notes: null };

describe("renewals", () => {
  beforeEach(() => vi.resetModules());

  it("keeps one reminder per type on the latest end date", async () => {
    const { db } = await freshDb();
    const vehicleId = Number(db.createVehicle(vehicle).lastInsertRowid);
    db.createRenewal({ vehicleId, ...policy });
    let reminders = db.listReminders(vehicleId);
    expect(reminders).toMatchObject([{ title: "Insurance renewal", dueDate: "2027-01-31", renewalType: "insurance", completedAt: null }]);

    // Logging the renewed policy moves the same reminder rather than adding another.
    db.createRenewal({ vehicleId, ...policy, startDate: "2027-01-31", endDate: "2028-01-30" });
    reminders = db.listReminders(vehicleId);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ dueDate: "2028-01-30" });

    db.createRenewal({ vehicleId, ...policy, type: "road-tax", provider: "DVLA", endDate: "2026-12-31" });
    expect(db.listReminders(vehicleId).map((r) => r.title).sort()).toEqual(["Insurance renewal", "Road tax renewal"]);
    db.closeDbForTests();
  });

  it("follows edits, type changes and deletes", async () => {
    const { db } = await freshDb();
    const vehicleId = Number(db.createVehicle(vehicle).lastInsertRowid);
    const id = Number(db.createRenewal({ vehicleId, ...policy }).lastInsertRowid);
    db.updateRenewal(id, vehicleId, { ...policy, type: "warranty", endDate: "2029-06-01" });
    expect(db.listReminders(vehicleId)).toMatchObject([{ title: "Warranty renewal", dueDate: "2029-06-01", renewalType: "warranty" }]);
    db.deleteRenewal(id, vehicleId);
    expect(db.listReminders(vehicleId)).toEqual([]);
    db.closeDbForTests();
  });

  it("keeps a dismissed reminder dismissed until the date moves", async () => {
    const { db } = await freshDb();
    const vehicleId = Number(db.createVehicle(vehicle).lastInsertRowid);
    const id = Number(db.createRenewal({ vehicleId, ...policy }).lastInsertRowid);
    const [reminder] = db.listReminders(vehicleId);
    db.completeReminder(reminder.id, vehicleId);
    db.updateRenewal(id, vehicleId, { ...policy, provider: "Renamed" });
    expect(db.listReminders(vehicleId)[0].completedAt).not.toBeNull();
    db.updateRenewal(id, vehicleId, { ...policy, endDate: "2027-03-01" });
    expect(db.listReminders(vehicleId)[0]).toMatchObject({ completedAt: null, dueDate: "2027-03-01" });
    db.closeDbForTests();
  });

  it("counts renewal costs in vehicle spend and the costs list", async () => {
    const { db } = await freshDb();
    const vehicleId = Number(db.createVehicle(vehicle).lastInsertRowid);
    db.createRenewal({ vehicleId, ...policy });
    db.createRenewal({ vehicleId, ...policy, type: "road-tax", provider: null, startDate: null, endDate: "2026-12-31", cost: 190 });
    expect(db.getVehicleLoggedSpend(vehicleId)).toBe(610);
    expect(db.listSpendEntries().filter((e) => e.type === "renewal").map((e) => [e.label, e.date, e.cost])).toEqual([
      ["Road tax", "2026-12-31", 190],
      ["Insurance · Acme", "2026-02-01", 420]
    ]);
    expect(db.listCurrentRenewals().map((r) => r.type)).toEqual(["road-tax", "insurance"]);
    db.closeDbForTests();
  });

  it("migrates old attachment tables so renewal documents can be attached", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-attach-migrate-"));
    const legacy = new Database(path.join(dir, "carvey.sqlite"));
    legacy.exec(`
      CREATE TABLE vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, make TEXT NOT NULL, model TEXT NOT NULL, year INTEGER, registration TEXT NOT NULL, vin TEXT, current_odometer INTEGER, photo_path TEXT, thumbnail_path TEXT, notes TEXT, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE record_attachments (id INTEGER PRIMARY KEY AUTOINCREMENT, record_type TEXT NOT NULL CHECK (record_type IN ('maintenance', 'repair', 'mot')), record_id INTEGER NOT NULL, vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE, filename TEXT NOT NULL, original_filename TEXT NOT NULL, mime_type TEXT NOT NULL, file_size INTEGER NOT NULL, file_path TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      INSERT INTO vehicles (make, model, registration) VALUES ('Old', 'Car', 'OLD 1');
      INSERT INTO record_attachments (record_type, record_id, vehicle_id, filename, original_filename, mime_type, file_size, file_path) VALUES ('mot', 1, 1, 'a.pdf', 'a.pdf', 'application/pdf', 1, '/uploads/attachments/1/a.pdf');
    `);
    legacy.close();
    process.env.CARVEY_DATA_DIR = dir;
    vi.resetModules();
    const db = await import("@/lib/db");
    expect(db.listAttachments("mot", 1)).toHaveLength(1);
    db.createAttachment({ recordType: "renewal", recordId: 5, vehicleId: 1, filename: "p.pdf", originalFilename: "p.pdf", mimeType: "application/pdf", fileSize: 1, filePath: "/uploads/attachments/1/p.pdf" });
    expect(db.listAttachments("renewal", 5)[0].id).toBe(2);
    db.closeDbForTests();
  });
});
