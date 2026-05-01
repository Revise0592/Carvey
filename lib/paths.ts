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
  if (!parts.length || parts.some(isUnsafePathSegment)) {
    throw new Error("Invalid upload path");
  }
  const targetPath = path.resolve(uploadDir, ...parts);
  const uploadRoot = path.resolve(uploadDir);
  if (!targetPath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("Invalid upload path");
  }
  return targetPath;
}

function isUnsafePathSegment(part: string) {
  return !part || part === "." || part === ".." || part.includes("/") || part.includes("\\") || path.isAbsolute(part);
}
