import fs from "node:fs";
import path from "node:path";

export const dataDir = path.resolve(process.env.CARVEY_DATA_DIR ?? path.join(process.cwd(), "data"));
export const uploadDir = path.join(dataDir, "uploads");
export const vehiclePhotoDir = path.join(uploadDir, "vehicles");
export const restoreStagingDir = path.join(dataDir, "restore-staging");
export const restoreRollbackDir = path.join(dataDir, "restore-rollback");
export const tempDir = path.join(dataDir, "tmp");

export function ensureDataDirs() {
  fs.mkdirSync(vehiclePhotoDir, { recursive: true });
  fs.mkdirSync(restoreStagingDir, { recursive: true });
  fs.mkdirSync(restoreRollbackDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
}

export function safeUploadPath(parts: string[]) {
  const relativePath = path.normalize(parts.join(path.sep));
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Invalid upload path");
  }
  return path.join(uploadDir, relativePath);
}
