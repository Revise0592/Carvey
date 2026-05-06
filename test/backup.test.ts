import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const showcaseAssetVersion = "v2";

async function freshModules(prefix = "carvey-backup-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  const db = await import("@/lib/db");
  const backup = await import("@/lib/backup");
  const paths = await import("@/lib/paths");
  return { dir, db, backup, paths };
}

function vehicleInput(make: string) {
  return {
    make,
    model: "Test",
    year: 2020,
    registration: `${make.slice(0, 2).toUpperCase()}20 TST`,
    vin: null,
    currentOdometer: 1000,
    purchasePrice: null,
    purchaseDate: null,
    notes: null
  };
}

describe("backup and restore", () => {
  const originalDemoBackup = process.env.CARVEY_SHOWCASE_DEMO_BACKUP;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.CARVEY_SHOWCASE_DEMO_BACKUP = originalDemoBackup;
  });

  it("creates a backup zip with manifest, SQLite DB, and uploads", async () => {
    const { db, backup, paths } = await freshModules();
    db.createVehicle(vehicleInput("Honda"));
    await fs.mkdir(paths.vehiclePhotoDir, { recursive: true });
    await fs.writeFile(path.join(paths.vehiclePhotoDir, "car.webp"), "image");

    const result = await backup.createBackupZip();
    const zip = new AdmZip(result.buffer);
    expect(zip.getEntry("manifest.json")).toBeTruthy();
    expect(zip.getEntry("carvey.sqlite")).toBeTruthy();
    expect(zip.getEntry("uploads/vehicles/car.webp")).toBeTruthy();

    const dbEntry = zip.getEntry("carvey.sqlite");
    expect(dbEntry).toBeTruthy();
    const extractedDb = path.join(paths.tempDir, "query-backup.sqlite");
    await fs.writeFile(extractedDb, dbEntry!.getData());
    const backupDb = new Database(extractedDb, { readonly: true });
    expect((backupDb.prepare("SELECT COUNT(*) as count FROM vehicles").get() as { count: number }).count).toBe(1);
    backupDb.close();
    db.closeDbForTests();
  });

  it("rejects invalid restore zips", async () => {
    const { backup, db } = await freshModules();
    const missingManifest = new AdmZip();
    missingManifest.addFile("carvey.sqlite", Buffer.from("not a db"));
    const missingResult = await backup.stageRestorePreview(new File([missingManifest.toBuffer()], "backup.zip", { type: "application/zip" }));
    expect(missingResult).toMatchObject({ ok: false });

    const traversalResult = await backup.stageRestorePreview(new File([zipWithUnsafeEntry("../evil.txt")], "backup.zip", { type: "application/zip" }));
    expect(traversalResult).toMatchObject({ ok: false, message: "Backup contains an unsafe file path." });
    db.closeDbForTests();
  });

  it("previews and restores a backup, replacing current data with rollback", async () => {
    const source = await freshModules("carvey-source-");
    const vehicleId = Number(source.db.createVehicle(vehicleInput("Source")).lastInsertRowid);
    source.db.updateVehicle(vehicleId, { ...vehicleInput("Source"), sold: true });
    source.db.updateCollectionName("The Fleet");
    source.db.createMaintenanceCategory("Tyres");
    const workshopId = Number(source.db.createWorkshop({
      name: "Preferred Autos",
      address: "1 Workshop Road",
      phone: "01234 567890",
      email: "hello@example.com",
      website: "https://example.com",
      notes: "Trusted",
      preferred: true
    }).lastInsertRowid);
    source.db.createRepair({
      vehicleId,
      date: "2026-01-01",
      odometer: null,
      fault: "Service",
      garage: "Preferred Autos",
      workshopId,
      cost: 120,
      notes: null
    });
    source.db.createPlannedPurchase({
      vehicleId,
      itemName: "Service parts",
      quantity: 1,
      estimatedCost: 75,
      supplier: "Parts supplier",
      url: null,
      dueDate: "2026-07-01",
      dueOdometer: null,
      notes: null
    });
    await fs.mkdir(source.paths.vehiclePhotoDir, { recursive: true });
    await fs.writeFile(path.join(source.paths.vehiclePhotoDir, "source.webp"), "source image");
    const sourceBackup = await source.backup.createBackupZip();
    source.db.closeDbForTests();

    const target = await freshModules("carvey-target-");
    target.db.createVehicle(vehicleInput("Target"));
    await fs.mkdir(target.paths.vehiclePhotoDir, { recursive: true });
    await fs.writeFile(path.join(target.paths.vehiclePhotoDir, "target.webp"), "target image");

    const preview = await target.backup.stageRestorePreview(new File([sourceBackup.buffer], "backup.zip", { type: "application/zip" }));
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("preview failed");
    expect(preview.summary.counts.vehicles).toBe(1);
    expect(preview.summary.counts.plannedPurchases).toBe(1);

    const restored = await target.backup.confirmRestore(preview.summary.token);
    expect(restored.ok).toBe(true);
    const vehicles = target.db.listVehicles();
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].make).toBe("Source");
    expect(vehicles[0].sold).toBe(1);
    expect(target.db.getCollectionName()).toBe("The Fleet");
    expect(target.db.listMaintenanceCategories()[0]).toMatchObject({ name: "Tyres" });
    expect(target.db.listWorkshops()[0]).toMatchObject({ name: "Preferred Autos", preferred: 1 });
    expect(target.db.listRepairs(vehicles[0].id)[0]).toMatchObject({ garage: "Preferred Autos", workshopId });
    expect(target.db.listPlannedPurchases(vehicles[0].id)[0]).toMatchObject({ itemName: "Service parts", estimatedCost: 75 });
    await expect(fs.stat(path.join(target.paths.vehiclePhotoDir, "source.webp"))).resolves.toBeTruthy();
    await expect(fs.readdir(target.paths.restoreRollbackDir)).resolves.toHaveLength(1);
    target.db.closeDbForTests();
  });

  it("restores older backups without planned purchases", async () => {
    const source = await freshModules("carvey-legacy-source-");
    source.db.createVehicle(vehicleInput("Legacy"));
    const sourceBackup = await source.backup.createBackupZip();
    const sourceZip = new AdmZip(sourceBackup.buffer);
    const dbEntry = sourceZip.getEntry("carvey.sqlite");
    const manifestEntry = sourceZip.getEntry("manifest.json");
    if (!dbEntry || !manifestEntry) throw new Error("backup missing entries");
    const legacyDbPath = path.join(source.paths.tempDir, "legacy.sqlite");
    await fs.writeFile(legacyDbPath, dbEntry.getData());
    const legacyDb = new Database(legacyDbPath);
    legacyDb.prepare("DROP TABLE planned_purchases").run();
    legacyDb.close();
    const legacyZip = new AdmZip();
    legacyZip.addLocalFile(legacyDbPath, "", "carvey.sqlite");
    legacyZip.addFile("manifest.json", manifestEntry.getData());
    source.db.closeDbForTests();

    const target = await freshModules("carvey-legacy-target-");
    const preview = await target.backup.stageRestorePreview(new File([legacyZip.toBuffer()], "legacy.zip", { type: "application/zip" }));
    expect(preview.ok).toBe(true);
    if (!preview.ok) throw new Error("preview failed");
    expect(preview.summary.counts.plannedPurchases).toBe(0);
    expect(await target.backup.confirmRestore(preview.summary.token)).toMatchObject({ ok: true });
    const [vehicle] = target.db.listVehicles();
    expect(vehicle.make).toBe("Legacy");
    expect(target.db.listPlannedPurchases(vehicle.id)).toHaveLength(0);
    target.db.closeDbForTests();
  });

  it("loads packaged showcase demo data and restores the previous live data snapshot", async () => {
    const demoAssetDir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-demo-asset-"));
    process.env.CARVEY_SHOWCASE_DEMO_BACKUP = path.join(demoAssetDir, "showcase-backup.zip");
    await writeShowcaseDemoBackup(process.env.CARVEY_SHOWCASE_DEMO_BACKUP);

    const target = await freshModules("carvey-demo-target-");
    const liveVehicleId = Number(target.db.createVehicle(vehicleInput("Private")).lastInsertRowid);
    target.db.createMaintenanceCategory("Original category");
    target.db.setVehiclePhoto(liveVehicleId, "/uploads/vehicles/private.webp", "/uploads/vehicles/private-thumb.webp");
    await fs.mkdir(target.paths.vehiclePhotoDir, { recursive: true });
    await fs.writeFile(path.join(target.paths.vehiclePhotoDir, "private.webp"), "private image");
    await fs.writeFile(path.join(target.paths.vehiclePhotoDir, "private-thumb.webp"), "private thumb");

    expect(await target.backup.getShowcaseDemoStatus()).toMatchObject({
      available: true,
      active: false,
      canRestorePrevious: false
    });

    expect(await target.backup.activateShowcaseDemoData()).toMatchObject({ ok: true });
    expect(target.db.getCollectionName()).toBe("Press Garage");
    expect(target.db.listVehicles()).toHaveLength(3);
    expect(target.db.listVehicles().some((vehicle) => vehicle.sold === 1)).toBe(true);
    expect(target.db.listMaintenanceCategories().map((category) => category.name)).toEqual(expect.arrayContaining(["Inspection", "Service", "Tyres"]));
    expect(await target.backup.getShowcaseDemoStatus()).toMatchObject({
      available: true,
      active: true,
      canRestorePrevious: true
    });

    expect(await target.backup.restorePreviousDebugDemoData()).toMatchObject({ ok: true });
    expect(target.db.getCollectionName()).toBe("My cars");
    expect(target.db.listVehicles()).toHaveLength(1);
    expect(target.db.getVehicle(liveVehicleId)?.make).toBe("Private");
    expect(target.db.listMaintenanceCategories()).toMatchObject([{ id: 1, name: "Original category", createdAt: expect.any(String), updatedAt: expect.any(String) }]);
    expect(await target.backup.getShowcaseDemoStatus()).toMatchObject({
      available: true,
      active: false,
      canRestorePrevious: false
    });
    target.db.closeDbForTests();
  });

  it("persists demo-mode changes back into the showcase backup", async () => {
    const demoAssetDir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-demo-persist-"));
    process.env.CARVEY_SHOWCASE_DEMO_BACKUP = path.join(demoAssetDir, "showcase-backup.zip");
    await writeShowcaseDemoBackup(process.env.CARVEY_SHOWCASE_DEMO_BACKUP);

    const target = await freshModules("carvey-demo-persist-target-");
    target.db.createVehicle(vehicleInput("Private"));

    expect(await target.backup.activateShowcaseDemoData()).toMatchObject({ ok: true });
    const civic = target.db.listVehicles().find((vehicle) => vehicle.make === "Honda");
    expect(civic).toBeTruthy();
    target.db.updateCollectionName("Demo Garage Updated");
    target.db.setVehiclePhoto(civic!.id, "/uploads/vehicles/custom-demo.webp", "/uploads/vehicles/custom-demo-thumb.webp");
    await fs.mkdir(target.paths.vehiclePhotoDir, { recursive: true });
    await writeShowcasePhoto(target.paths.vehiclePhotoDir, "custom-demo", "#7C3AED");

    await expect(target.backup.syncShowcaseDemoBackupIfActive()).resolves.toBe(true);
    await expect(target.backup.restorePreviousDebugDemoData()).resolves.toMatchObject({ ok: true });
    await expect(target.backup.activateShowcaseDemoData()).resolves.toMatchObject({ ok: true });

    const refreshedCivic = target.db.listVehicles().find((vehicle) => vehicle.make === "Honda");
    expect(target.db.getCollectionName()).toBe("Demo Garage Updated");
    expect(refreshedCivic?.photoPath).toBe("/uploads/vehicles/custom-demo.webp");
    await expect(fs.stat(path.join(target.paths.vehiclePhotoDir, "custom-demo.webp"))).resolves.toBeTruthy();
    target.db.closeDbForTests();
  });

  it("fails safely when restoring previous demo data without a saved snapshot", async () => {
    const target = await freshModules("carvey-demo-missing-");
    await expect(target.backup.restorePreviousDebugDemoData()).resolves.toMatchObject({
      ok: false,
      message: "No previous live data snapshot is available."
    });
    target.db.closeDbForTests();
  });
});

async function writeShowcaseDemoBackup(outputPath: string) {
  const source = await freshModules("carvey-demo-source-");
  source.db.updateCollectionName("Press Garage");
  source.db.createMaintenanceCategory("Service");
  source.db.createMaintenanceCategory("Tyres");
  source.db.createMaintenanceCategory("Inspection");
  const workshopId = Number(source.db.createWorkshop({
    name: "North Loop Motors",
    address: "27 Demo Street",
    phone: "020 7946 0123",
    email: "service@northloop.invalid",
    website: "https://northloop.invalid",
    notes: "Fictional showcase workshop",
    preferred: true
  }).lastInsertRowid);

  const civicId = Number(source.db.createVehicle({
    make: "Honda",
    model: "Civic Type R",
    year: 2019,
    registration: "DE19 MOO",
    vin: "DEMOHONDACIVIC001",
    currentOdometer: 42100,
    purchasePrice: 32995,
    purchaseDate: "2024-03-12",
    notes: "Weekend car with a tidy paper trail."
  }).lastInsertRowid);
  const volvoId = Number(source.db.createVehicle({
    make: "Volvo",
    model: "V70 D5",
    year: 2007,
    registration: "PR07 EST",
    vin: "DEMOVOLVOV70D5002",
    currentOdometer: 163200,
    purchasePrice: 3950,
    purchaseDate: "2021-09-01",
    notes: "Long-haul estate with recent suspension work."
  }).lastInsertRowid);
  const mazdaId = Number(source.db.createVehicle({
    make: "Mazda",
    model: "MX-5",
    year: 2002,
    registration: "MK02 SUN",
    vin: "DEMOMAZDAMX500003",
    currentOdometer: 88750,
    purchasePrice: 4600,
    purchaseDate: "2020-05-10",
    notes: "Sold car kept here to show the sold badge and history export."
  }).lastInsertRowid);
  source.db.updateVehicle(mazdaId, {
    make: "Mazda",
    model: "MX-5",
    year: 2002,
    registration: "MK02 SUN",
    vin: "DEMOMAZDAMX500003",
    currentOdometer: 88750,
    purchasePrice: 4600,
    purchaseDate: "2020-05-10",
    notes: "Sold car kept here to show the sold badge and history export.",
    sold: true
  });

  source.db.createMaintenance({
    vehicleId: civicId,
    date: "2026-02-14",
    odometer: 41880,
    category: "Service",
    description: "Major service with spark plugs and brake fluid",
    cost: 480,
    notes: "Dealer stamps up to date."
  });
  source.db.createMaintenance({
    vehicleId: volvoId,
    date: "2026-01-09",
    odometer: 162400,
    category: "Tyres",
    description: "Fitted four all-season tyres",
    cost: 612,
    notes: "Matching set fitted for winter touring."
  });
  source.db.createRepair({
    vehicleId: volvoId,
    date: "2026-03-03",
    odometer: 163050,
    fault: "Rear spring replacement",
    garage: "North Loop Motors",
    workshopId,
    cost: 355,
    notes: "Both rear springs replaced as a pair."
  });
  source.db.createRepair({
    vehicleId: mazdaId,
    date: "2025-08-21",
    odometer: 88210,
    fault: "New hood drains and alignment",
    garage: "North Loop Motors",
    workshopId,
    cost: 190,
    notes: "Sorted water ingress before sale."
  });
  source.db.createMot({
    vehicleId: civicId,
    testDate: "2026-04-18",
    expiryDate: "2026-05-20",
    odometer: 42090,
    result: "advisory",
    advisories: "Front tyres wearing on inner shoulders",
    cost: 54.85,
    certificateRef: "DEMO-CIVIC-MOT"
  });
  source.db.createMot({
    vehicleId: mazdaId,
    testDate: "2025-06-10",
    expiryDate: "2026-06-10",
    odometer: 88050,
    result: "pass",
    advisories: null,
    cost: 54.85,
    certificateRef: "DEMO-MX5-MOT"
  });
  source.db.createReminder({
    vehicleId: civicId,
    title: "Track day brake check",
    dueDate: "2026-05-18",
    dueOdometer: null,
    recurrence: null
  });
  source.db.createReminder({
    vehicleId: volvoId,
    title: "Cambelt planning",
    dueDate: null,
    dueOdometer: 165000,
    recurrence: "Every 10000 miles"
  });
  source.db.upsertMotReminder(civicId, "2026-05-20");

  await fs.mkdir(source.paths.vehiclePhotoDir, { recursive: true });
  await writeShowcasePhoto(source.paths.vehiclePhotoDir, `showcase-civic-${showcaseAssetVersion}`, "#D93A2F");
  await writeShowcasePhoto(source.paths.vehiclePhotoDir, `showcase-volvo-${showcaseAssetVersion}`, "#26547C");
  await writeShowcasePhoto(source.paths.vehiclePhotoDir, `showcase-mx5-${showcaseAssetVersion}`, "#E0A100");
  source.db.setVehiclePhoto(civicId, `/uploads/vehicles/showcase-civic-${showcaseAssetVersion}.webp`, `/uploads/vehicles/showcase-civic-${showcaseAssetVersion}-thumb.webp`);
  source.db.setVehiclePhoto(volvoId, `/uploads/vehicles/showcase-volvo-${showcaseAssetVersion}.webp`, `/uploads/vehicles/showcase-volvo-${showcaseAssetVersion}-thumb.webp`);
  source.db.setVehiclePhoto(mazdaId, `/uploads/vehicles/showcase-mx5-${showcaseAssetVersion}.webp`, `/uploads/vehicles/showcase-mx5-${showcaseAssetVersion}-thumb.webp`);

  const backup = await source.backup.createBackupZip();
  await fs.writeFile(outputPath, backup.buffer);
  source.db.closeDbForTests();
}

async function writeShowcasePhoto(targetDir: string, targetBase: string, accent: string) {
  await sharp({ create: { width: 1200, height: 720, channels: 3, background: accent } })
    .webp({ quality: 82 })
    .toFile(path.join(targetDir, `${targetBase}.webp`));
  await sharp({ create: { width: 640, height: 420, channels: 3, background: accent } })
    .webp({ quality: 78 })
    .toFile(path.join(targetDir, `${targetBase}-thumb.webp`));
}

function zipWithUnsafeEntry(entryName: string) {
  const name = Buffer.from(entryName);
  const localHeader = Buffer.alloc(30 + name.length);
  let offset = 0;
  localHeader.writeUInt32LE(0x04034b50, offset); offset += 4;
  localHeader.writeUInt16LE(20, offset); offset += 2;
  localHeader.writeUInt16LE(0, offset); offset += 2;
  localHeader.writeUInt16LE(0, offset); offset += 2;
  localHeader.writeUInt16LE(0, offset); offset += 2;
  localHeader.writeUInt16LE(0, offset); offset += 2;
  localHeader.writeUInt32LE(0, offset); offset += 4;
  localHeader.writeUInt32LE(0, offset); offset += 4;
  localHeader.writeUInt32LE(0, offset); offset += 4;
  localHeader.writeUInt16LE(name.length, offset); offset += 2;
  localHeader.writeUInt16LE(0, offset); offset += 2;
  name.copy(localHeader, offset);

  const centralHeader = Buffer.alloc(46 + name.length);
  offset = 0;
  centralHeader.writeUInt32LE(0x02014b50, offset); offset += 4;
  centralHeader.writeUInt16LE(20, offset); offset += 2;
  centralHeader.writeUInt16LE(20, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt32LE(0, offset); offset += 4;
  centralHeader.writeUInt32LE(0, offset); offset += 4;
  centralHeader.writeUInt32LE(0, offset); offset += 4;
  centralHeader.writeUInt16LE(name.length, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt16LE(0, offset); offset += 2;
  centralHeader.writeUInt32LE(0, offset); offset += 4;
  centralHeader.writeUInt32LE(0, offset); offset += 4;
  name.copy(centralHeader, offset);

  const end = Buffer.alloc(22);
  offset = 0;
  end.writeUInt32LE(0x06054b50, offset); offset += 4;
  end.writeUInt16LE(0, offset); offset += 2;
  end.writeUInt16LE(0, offset); offset += 2;
  end.writeUInt16LE(1, offset); offset += 2;
  end.writeUInt16LE(1, offset); offset += 2;
  end.writeUInt32LE(centralHeader.length, offset); offset += 4;
  end.writeUInt32LE(localHeader.length, offset); offset += 4;
  end.writeUInt16LE(0, offset);

  return Buffer.concat([localHeader, centralHeader, end]);
}
