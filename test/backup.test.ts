import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.resetModules();
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
    source.db.createVehicle(vehicleInput("Source"));
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

    const restored = await target.backup.confirmRestore(preview.summary.token);
    expect(restored.ok).toBe(true);
    const vehicles = target.db.listVehicles();
    expect(vehicles).toHaveLength(1);
    expect(vehicles[0].make).toBe("Source");
    await expect(fs.stat(path.join(target.paths.vehiclePhotoDir, "source.webp"))).resolves.toBeTruthy();
    await expect(fs.readdir(target.paths.restoreRollbackDir)).resolves.toHaveLength(1);
    target.db.closeDbForTests();
  });
});

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
