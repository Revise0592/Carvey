import fs from "node:fs/promises";
import path from "node:path";
import { writeBackupFile } from "./backup";
import { todayIso } from "./dates";
import { getAppSettings, setAppSetting } from "./db";
import { ensureDataDirs, scheduledBackupDir } from "./paths";

/**
 * Nightly backups to data/backups/, in the same zip format as the download, so any of them can be
 * restored from Settings → Backup. Copy that folder off the machine (restic, rsync, Unraid's
 * appdata backup) to protect against disk loss.
 */

export const BACKUP_KEEP_OPTIONS = [3, 7, 14, 30] as const;
/** Local hour after which the nightly backup runs. */
export const BACKUP_HOUR = 3;

const keys = {
  enabled: "backup.auto",
  keep: "backup.keep",
  lastRunDate: "backup.lastRunDate",
  lastResult: "backup.lastResult"
} as const;

const fileNamePattern = /^carvey-backup-\d{4}-\d{2}-\d{2}\.zip$/;

export type ScheduledBackupSettings = { enabled: boolean; keep: number; lastRunDate: string | null; lastResult: string | null };

export function getScheduledBackupSettings(): ScheduledBackupSettings {
  const stored = getAppSettings();
  const keep = Number.parseInt(stored.get(keys.keep) ?? "", 10);
  return {
    // On unless turned off: a fresh install should have a backup the morning after its first day.
    enabled: stored.get(keys.enabled) !== "false",
    keep: (BACKUP_KEEP_OPTIONS as readonly number[]).includes(keep) ? keep : 3,
    lastRunDate: stored.get(keys.lastRunDate) ?? null,
    lastResult: stored.get(keys.lastResult) ?? null
  };
}

export function updateScheduledBackupSettings(input: { enabled: boolean; keep: number }) {
  setAppSetting(keys.enabled, input.enabled ? "true" : "false");
  setAppSetting(keys.keep, String(input.keep));
}

export type ScheduledBackupFile = { name: string; size: number; modifiedAt: string };

export async function listScheduledBackups(): Promise<ScheduledBackupFile[]> {
  let names: string[];
  try {
    names = await fs.readdir(scheduledBackupDir);
  } catch {
    return [];
  }
  const files = await Promise.all(names.filter((name) => fileNamePattern.test(name)).map(async (name) => {
    const stat = await fs.stat(path.join(scheduledBackupDir, name));
    return { name, size: stat.size, modifiedAt: stat.mtime.toISOString() };
  }));
  return files.sort((a, b) => b.name.localeCompare(a.name));
}

/** The on-disk path of a scheduled backup, or null if the name isn't one of ours. */
export function scheduledBackupPath(name: string) {
  return fileNamePattern.test(name) ? path.join(scheduledBackupDir, name) : null;
}

export async function pruneScheduledBackups(keep: number) {
  const files = await listScheduledBackups();
  for (const file of files.slice(keep)) await fs.rm(path.join(scheduledBackupDir, file.name), { force: true });
}

export type ScheduledBackupResult = { status: "disabled" | "not-yet" | "already-ran" | "done" | "failed"; detail?: string };

let inFlight: Promise<ScheduledBackupResult> | null = null;

/** Runs tonight's backup if it's enabled, past BACKUP_HOUR and not done today. `force` skips the time checks. */
export async function runScheduledBackup(options: { now?: Date; force?: boolean } = {}): Promise<ScheduledBackupResult> {
  if (inFlight) return inFlight;
  inFlight = runOnce(options);
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function runOnce({ now = new Date(), force = false }: { now?: Date; force?: boolean }): Promise<ScheduledBackupResult> {
  const settings = getScheduledBackupSettings();
  const today = todayIso(now);
  if (!force) {
    if (!settings.enabled) return { status: "disabled" };
    if (now.getHours() < BACKUP_HOUR) return { status: "not-yet" };
    if (settings.lastRunDate === today) return { status: "already-ran" };
  }
  ensureDataDirs();
  try {
    await writeBackupFile(path.join(scheduledBackupDir, `carvey-backup-${today}.zip`));
    await pruneScheduledBackups(settings.keep);
    setAppSetting(keys.lastRunDate, today);
    setAppSetting(keys.lastResult, `${now.toISOString()} done`);
    return { status: "done" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    // lastRunDate stays unset so the next tick retries.
    setAppSetting(keys.lastResult, `${now.toISOString()} failed — ${detail}`);
    console.error("[Carvey] Scheduled backup failed:", error);
    return { status: "failed", detail };
  }
}
