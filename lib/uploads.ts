import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { attachmentDir } from "./paths";

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
  try {
    return save({ filename, filePath: `/uploads/attachments/${vehicleId}/${filename}` });
  } catch (error) {
    await fs.rm(diskPath, { force: true });
    throw error;
  }
}
