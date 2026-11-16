import fs from "node:fs/promises";
import path from "node:path";
import { restoreRollbackDir, restoreStagingDir, tempDir } from "./paths";
import { backfillThumbnails } from "./uploads";

/**
 * Removes leftovers that nothing else cleans up: abandoned restore previews and CSV imports,
 * interrupted backup work folders, and all but the newest few pre-restore snapshots (each one is a
 * full copy of the database and uploads).
 */

const dayMs = 24 * 60 * 60 * 1000;
export const rollbackSnapshotsKept = 3;

async function entries(dir: string) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function removeOlderThan(dir: string, maxAgeMs: number, now: number, filter: (name: string) => boolean = () => true) {
  let removed = 0;
  for (const entry of await entries(dir)) {
    if (!filter(entry.name)) continue;
    const target = path.join(dir, entry.name);
    const stat = await fs.stat(target).catch(() => null);
    if (stat && now - stat.mtimeMs > maxAgeMs) {
      await fs.rm(target, { recursive: true, force: true });
      removed++;
    }
  }
  return removed;
}

export async function cleanUpDataDirectory(now = Date.now()) {
  const staging = await removeOlderThan(restoreStagingDir, dayMs, now);
  const imports = await removeOlderThan(path.join(tempDir, "csv-import"), dayMs, now);
  const work = await removeOlderThan(tempDir, dayMs, now, (name) => name.startsWith("backup-") || name.startsWith("backup-summary-"));

  // Rollback folders are named by ISO timestamp, so name order is age order.
  const rollbacks = (await entries(restoreRollbackDir)).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse();
  for (const name of rollbacks.slice(rollbackSnapshotsKept)) await fs.rm(path.join(restoreRollbackDir, name), { recursive: true, force: true });

  const thumbnails = await backfillThumbnails();

  return { staging, imports, work, rollbacks: Math.max(0, rollbacks.length - rollbackSnapshotsKept), thumbnails };
}
