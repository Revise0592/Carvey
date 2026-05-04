import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshModules() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-photo-"));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  const db = await import("@/lib/db");
  const upload = await import("@/lib/photo-upload");
  const paths = await import("@/lib/paths");
  return { db, upload, paths };
}

describe("processVehiclePhotoUpload", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("stores optimized vehicle photos for valid uploads", async () => {
    const { db, upload } = await freshModules();
    const vehicleId = Number(db.createVehicle({
      make: "Honda",
      model: "Jazz",
      year: 2020,
      registration: "HJ20 ABC",
      vin: null,
      currentOdometer: 12000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    const buffer = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const result = await upload.processVehiclePhotoUpload(vehicleId, new File([new Uint8Array(buffer)], "car.png", { type: "image/png" }));

    expect(result.ok).toBe(true);
    expect(db.getVehicle(vehicleId)?.photoPath).toMatch(/\.webp$/);
    db.closeDbForTests();
  });

  it("recreates the vehicle upload directory before saving", async () => {
    const { db, upload, paths } = await freshModules();
    const vehicleId = Number(db.createVehicle({
      make: "Mazda",
      model: "3",
      year: 2021,
      registration: "MZ21 DEM",
      vin: null,
      currentOdometer: 8000,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    await fs.rm(paths.vehiclePhotoDir, { recursive: true, force: true });

    const buffer = await sharp({ create: { width: 1200, height: 900, channels: 3, background: "#ccd5e1" } }).png().toBuffer();
    const result = await upload.processVehiclePhotoUpload(vehicleId, new File([new Uint8Array(buffer)], "car.png", { type: "image/png" }));

    expect(result.ok).toBe(true);
    await expect(fs.stat(paths.vehiclePhotoDir)).resolves.toBeTruthy();
    db.closeDbForTests();
  });

  it("rejects unsupported uploads and missing vehicles", async () => {
    const { db, upload } = await freshModules();
    const textFile = new File(["hello"], "car.txt", { type: "text/plain" });

    await expect(upload.processVehiclePhotoUpload(999, textFile)).resolves.toMatchObject({ ok: false, status: 404 });

    const vehicleId = Number(db.createVehicle({
      make: "Ford",
      model: "Focus",
      year: null,
      registration: "FF11 FFF",
      vin: null,
      currentOdometer: null,
      purchasePrice: null,
      purchaseDate: null,
      notes: null
    }).lastInsertRowid);
    await expect(upload.processVehiclePhotoUpload(vehicleId, textFile)).resolves.toMatchObject({ ok: false, status: 400 });
    db.closeDbForTests();
  });
});
