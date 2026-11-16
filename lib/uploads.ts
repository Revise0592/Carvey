import crypto from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { attachmentDir, safeUploadPath } from "./paths";

/** The only file types accepted for record attachments and gallery photos, with their stored extension. */
const extensions: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/plain": ".txt"
};

export function extensionForMime(mime: string) {
  return extensions[mime] ?? null;
}

/**
 * Checks the file's first bytes match the type the browser claimed. The claimed type comes from
 * the client, so without this a file of any kind could be stored as "image/png".
 */
export function contentMatchesMime(bytes: Uint8Array, mime: string) {
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, index) => bytes[offset + index] === byte);
  switch (mime) {
    case "application/pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46]); // %PDF
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8); // RIFF....WEBP
    case "text/plain":
      return !bytes.subarray(0, 8192).includes(0); // no NUL bytes: really text
    default:
      return false;
  }
}

/**
 * Writes an upload under uploads/attachments/<vehicleId>/ with a random name and an extension
 * chosen from its checked type (never the client's file name), then runs `save` to record it.
 * If `save` throws, the file is removed again so no orphan is left on disk.
 */
export async function storeVehicleUpload<T>(vehicleId: number, mime: string, bytes: Uint8Array, save: (stored: { filename: string; filePath: string }) => T) {
  const extension = extensionForMime(mime);
  if (!extension) throw new Error(`Unsupported type ${mime}`);
  const filename = `${vehicleId}-${crypto.randomUUID()}${extension}`;
  const directory = path.join(attachmentDir, String(vehicleId));
  const diskPath = path.join(directory, filename);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(diskPath, bytes);
  let saved: T;
  try {
    saved = save({ filename, filePath: `/uploads/attachments/${vehicleId}/${filename}` });
  } catch (error) {
    await fs.rm(diskPath, { force: true });
    throw error;
  }
  if (mime.startsWith("image/")) await createThumbnail(diskPath);
  return saved;
}

// ─── Thumbnails ─────────────────────────────────────────────────────────────

const thumbnailSuffix = ".thumb.webp";
const thumbnailSource = /\.(jpe?g|png|webp)$/i;

/** The public path of an image upload's thumbnail (it may not exist yet). */
export function thumbnailPathFor(filePath: string) {
  return `${filePath}${thumbnailSuffix}`;
}

export function isThumbnail(name: string) {
  return name.endsWith(thumbnailSuffix);
}

/**
 * Writes a ~480 px WebP next to an uploaded image, for gallery grids. Phone photos are often 3-8 MB;
 * the thumbnail is usually 20-60 KB. Failures are ignored: the grid falls back to the original.
 */
export async function createThumbnail(diskPath: string) {
  if (!thumbnailSource.test(diskPath) || isThumbnail(diskPath)) return false;
  try {
    const { default: sharp } = await import("sharp");
    await sharp(diskPath, { failOn: "none" })
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76 })
      .toFile(`${diskPath}${thumbnailSuffix}`);
    return true;
  } catch {
    return false;
  }
}

/** Thumbnails for images uploaded before thumbnails existed. A bounded batch per call. */
export async function backfillThumbnails(limit = 100) {
  let made = 0;
  let vehicleDirs: string[];
  try {
    vehicleDirs = await fs.readdir(attachmentDir);
  } catch {
    return 0;
  }
  for (const vehicleDir of vehicleDirs) {
    const dir = path.join(attachmentDir, vehicleDir);
    const names = await fs.readdir(dir).catch(() => [] as string[]);
    const existing = new Set(names);
    for (const name of names) {
      if (made >= limit) return made;
      if (!thumbnailSource.test(name) || isThumbnail(name) || existing.has(`${name}${thumbnailSuffix}`)) continue;
      if (await createThumbnail(path.join(dir, name))) made++;
    }
  }
  return made;
}

/** True when an upload (by its /uploads/... path) already has a thumbnail on disk. */
export function hasThumbnail(filePath: string) {
  if (!filePath.startsWith("/uploads/")) return false;
  try {
    return existsSync(safeUploadPath(thumbnailPathFor(filePath).replace(/^\/uploads\//, "").split("/")));
  } catch {
    return false;
  }
}
