import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { ensureDataDirs, vehiclePhotoDir } from "./paths";

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"]);
const maxUploadBytes = 18 * 1024 * 1024;

export type OptimizedVehicleImage = {
  photoPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
};

export function assertSupportedImage(type: string) {
  if (!acceptedMimeTypes.has(type)) {
    throw new Error("Use a JPEG, PNG, WebP, AVIF, HEIC, or HEIF image.");
  }
}

export async function optimizeVehiclePhoto(file: File, vehicleId: number): Promise<OptimizedVehicleImage> {
  assertSupportedImage(file.type);
  if (file.size > maxUploadBytes) {
    throw new Error("Use an image smaller than 18 MB.");
  }
  ensureDataDirs();
  const buffer = Buffer.from(await file.arrayBuffer());
  const baseName = `${vehicleId}-${crypto.randomUUID()}`;
  const photoDiskPath = path.join(vehiclePhotoDir, `${baseName}.webp`);
  const thumbDiskPath = path.join(vehiclePhotoDir, `${baseName}-thumb.webp`);

  const image = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const resized = image.resize({
    width: 1600,
    height: 1600,
    fit: "inside",
    withoutEnlargement: true
  });

  await resized.webp({ quality: 82 }).toFile(photoDiskPath);
  await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 420, height: 300, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(thumbDiskPath);

  return {
    photoPath: `/uploads/vehicles/${path.basename(photoDiskPath)}`,
    thumbnailPath: `/uploads/vehicles/${path.basename(thumbDiskPath)}`,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0
  };
}
