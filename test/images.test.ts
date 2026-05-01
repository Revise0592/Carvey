import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("optimizeVehiclePhoto", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a resized WebP image and thumbnail", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-images-"));
    process.env.CARVEY_DATA_DIR = dir;
    const { ensureDataDirs, vehiclePhotoDir } = await import("@/lib/paths");
    ensureDataDirs();
    const { optimizeVehiclePhoto } = await import("@/lib/images");
    const input = await sharp({
      create: {
        width: 2400,
        height: 1400,
        channels: 3,
        background: "#0f766e"
      }
    }).jpeg().toBuffer();
    const file = new File([new Uint8Array(input)], "vehicle.jpg", { type: "image/jpeg" });

    const result = await optimizeVehiclePhoto(file, 12);
    const photoPath = path.join(vehiclePhotoDir, path.basename(result.photoPath));
    const thumbPath = path.join(vehiclePhotoDir, path.basename(result.thumbnailPath));
    const photoMeta = await sharp(photoPath).metadata();
    const thumbMeta = await sharp(thumbPath).metadata();

    expect(result.photoPath).toMatch(/\.webp$/);
    expect(photoMeta.width).toBeLessThanOrEqual(1600);
    expect(thumbMeta.width).toBeLessThanOrEqual(420);
  });
});
