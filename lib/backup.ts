import AdmZip from "adm-zip";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { dbFileName, getDb } from "./db";
import { dataDir, ensureDataDirs, restoreRollbackDir, restoreStagingDir, tempDir, uploadDir } from "./paths";

const backupFormatVersion = 1;
const appVersion = "0.1.0";
const maxRestoreBytes = 256 * 1024 * 1024;
const showcaseDemoBackupPath = process.env.CARVEY_SHOWCASE_DEMO_BACKUP ?? path.resolve(process.cwd(), "data/demo/showcase-backup.zip");
const debugDemoDir = path.join(dataDir, "debug-demo");
const debugDemoRollbackZipPath = path.join(debugDemoDir, "previous-live-data.zip");
const debugDemoStatePath = path.join(debugDemoDir, "state.json");

export type BackupManifest = {
  app: "Carvey";
  appVersion: string;
  formatVersion: number;
  createdAt: string;
  database: string;
  uploads: string[];
};

export type RestoreSummary = {
  token: string;
  createdAt: string;
  appVersion: string;
  formatVersion: number;
  uploadCount: number;
  counts: {
    vehicles: number;
    maintenance: number;
    repairs: number;
    mots: number;
    reminders: number;
    plannedPurchases: number;
    fuel?: number;
    renewals?: number;
  };
};

type PreviewResult = { ok: true; summary: RestoreSummary } | { ok: false; message: string };
type MutationResult = { ok: true } | { ok: false; message: string };
type DebugDemoState = {
  active: boolean;
  activatedAt: string | null;
};

export type ShowcaseDemoStatus = {
  available: boolean;
  active: boolean;
  canRestorePrevious: boolean;
  summary: RestoreSummary | null;
};

export async function createBackupZip(options: { showcase?: boolean } = {}) {
  ensureDataDirs();
  const token = crypto.randomUUID();
  const workDir = path.join(tempDir, `backup-${token}`);
  await fsp.mkdir(workDir, { recursive: true });
  const dbCopyPath = path.join(workDir, dbFileName);

  await getDb().backup(dbCopyPath);
  scrubBackupCopy(dbCopyPath, options.showcase === true);

  const uploads = await listUploadFiles();
  const manifest: BackupManifest = {
    app: "Carvey",
    appVersion,
    formatVersion: backupFormatVersion,
    createdAt: new Date().toISOString(),
    database: dbFileName,
    uploads
  };

  const zip = new AdmZip();
  zip.addLocalFile(dbCopyPath, "", dbFileName);
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  for (const relativePath of uploads) {
    zip.addLocalFile(path.join(uploadDir, relativePath), "uploads", relativePath);
  }

  const buffer = zip.toBuffer();
  await fsp.rm(workDir, { recursive: true, force: true });
  return { buffer, manifest };
}

/**
 * Removes sign-in state from a backup copy: sessions, pending 2FA challenges and failed-login
 * counters belong to this server, and a stolen backup must not contain anything that logs in.
 */
function scrubBackupCopy(dbPath: string, showcase = false) {
  const copy = new Database(dbPath);
  try {
    const tables = showcase ? showcaseTablesKept : tablesNotRestored;
    for (const table of tables) {
      const exists = copy.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
      if (exists) copy.exec(`DELETE FROM "${table}"`);
    }
    if (showcase) copy.exec(`DELETE FROM app_settings WHERE ${showcaseSettingsKeptWhere}`);
    copy.exec("VACUUM");
  } finally {
    copy.close();
  }
}

export async function stageRestorePreview(file: File): Promise<PreviewResult> {
  ensureDataDirs();
  if (file.size <= 0) return { ok: false, message: "Choose a backup file to restore." };
  if (file.size > maxRestoreBytes) return { ok: false, message: "Backup file is larger than 256 MB." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const token = crypto.randomUUID();
  const stageDir = path.join(restoreStagingDir, token);
  const zipPath = path.join(stageDir, "backup.zip");
  const extractDir = path.join(stageDir, "preview");
  await fsp.mkdir(stageDir, { recursive: true });
  await fsp.writeFile(zipPath, buffer);

  try {
    const summary = await validateAndSummariseZip(buffer, token, extractDir);
    await fsp.writeFile(path.join(stageDir, "summary.json"), JSON.stringify(summary, null, 2));
    return { ok: true, summary };
  } catch (error) {
    await fsp.rm(stageDir, { recursive: true, force: true });
    return { ok: false, message: error instanceof Error ? error.message : "Could not read backup." };
  }
}

export async function readRestoreSummary(token: string | undefined) {
  if (!token || !isSafeToken(token)) return null;
  try {
    const content = await fsp.readFile(path.join(restoreStagingDir, token, "summary.json"), "utf8");
    return JSON.parse(content) as RestoreSummary;
  } catch {
    return null;
  }
}

export async function confirmRestore(token: string) {
  if (!isSafeToken(token)) return { ok: false as const, message: "Invalid restore token." };
  const stageDir = path.join(restoreStagingDir, token);
  const zipPath = path.join(stageDir, "backup.zip");
  const extractDir = path.join(stageDir, "restore");

  let buffer: Buffer;
  try {
    buffer = await fsp.readFile(zipPath);
  } catch {
    return { ok: false as const, message: "Restore preview has expired or is missing." };
  }

  try {
    await validateAndSummariseZip(buffer, token, extractDir);
    const rollbackDir = await createRollbackSnapshot();
    await restoreExtractedBackup(extractDir);
    await fsp.rm(stageDir, { recursive: true, force: true });
    return { ok: true as const, rollbackDir };
  } catch (error) {
    return { ok: false as const, message: error instanceof Error ? error.message : "Restore failed." };
  }
}

export async function getShowcaseDemoStatus(): Promise<ShowcaseDemoStatus> {
  const summary = await readBackupSummaryFromFile(showcaseDemoBackupPath);
  const state = await readDebugDemoState();
  return {
    available: Boolean(summary),
    active: state.active,
    canRestorePrevious: await fileExists(debugDemoRollbackZipPath),
    summary
  };
}

export async function activateShowcaseDemoData(): Promise<MutationResult> {
  ensureDataDirs();
  const buffer = await readPackagedDemoBuffer();
  if (!buffer) return { ok: false, message: "Showcase demo backup is not available." };

  const state = await readDebugDemoState();
  const rollbackExists = await fileExists(debugDemoRollbackZipPath);
  await fsp.mkdir(debugDemoDir, { recursive: true });

  // Preserve the original live data snapshot while demo mode is active.
  if (!state.active || !rollbackExists) {
    const liveBackup = await createBackupZip();
    await fsp.writeFile(debugDemoRollbackZipPath, liveBackup.buffer);
  }

  const extractDir = path.join(debugDemoDir, "showcase-extract");
  await restoreValidatedBackupBuffer(buffer, `showcase-${Date.now()}`, extractDir, true);
  await writeDebugDemoState({ active: true, activatedAt: new Date().toISOString() });
  return { ok: true };
}

export async function restorePreviousDebugDemoData(): Promise<MutationResult> {
  ensureDataDirs();
  const buffer = await readFileIfExists(debugDemoRollbackZipPath);
  if (!buffer) return { ok: false, message: "No previous live data snapshot is available." };

  const extractDir = path.join(debugDemoDir, "rollback-extract");
  await restoreValidatedBackupBuffer(buffer, `rollback-${Date.now()}`, extractDir);
  await fsp.rm(debugDemoDir, { recursive: true, force: true });
  return { ok: true };
}

export async function saveCurrentDataAsShowcaseDemo(): Promise<MutationResult> {
  await writeCurrentDataToShowcaseDemoBackup();
  return { ok: true };
}

export async function syncShowcaseDemoBackupIfActive() {
  const state = await readDebugDemoState();
  if (!state.active) return false;
  await writeCurrentDataToShowcaseDemoBackup();
  return true;
}

/** Tables that are never copied from a backup: sign-in state belongs to this server, not the data. */
const tablesNotRestored = new Set(["auth_sessions", "auth_challenges", "auth_throttle"]);

/**
 * Settings that stay as they are on this server when restoring. Otherwise a backup taken with
 * sign-in turned off (or a tampered one) could silently turn sign-in off here.
 */
const settingsNotRestored = ["authDisabled"];

/**
 * The packaged showcase backup is committed to a public repository, so it is written without this
 * server's account, sign-in state, notification history or private settings (notification URLs
 * and tokens, the calendar feed token). Loading it keeps those as they are on this server, so the
 * admin stays signed in. Keep scripts/generate-showcase-backup.mjs in step with these lists.
 */
const showcaseTablesKept = new Set(["admin_users", "notification_log", ...tablesNotRestored]);
const showcaseSettingsKeptWhere = `key LIKE 'notify.%' OR key LIKE 'calendar.%' OR key IN (${settingsNotRestored.map((key) => `'${key}'`).join(", ")})`;

function tableColumns(database: Database.Database, schema: "main" | "restore_backup", table: string) {
  return (database.prepare(`PRAGMA ${schema}.table_info("${table}")`).all() as Array<{ name: string }>).map((column) => column.name);
}

/**
 * Replaces every table's rows with the backup's. Driven by the live schema rather than a fixed
 * list, so new tables are always included; columns a backup predates fall back to their defaults.
 */
function restoreDatabaseContents(backupDbPath: string, showcase = false) {
  const database = getDb();
  const backupPath = backupDbPath.replaceAll("'", "''");

  database.pragma("foreign_keys = OFF");
  database.exec(`ATTACH DATABASE '${backupPath}' AS restore_backup`);
  try {
    const listTables = (schema: "main" | "restore_backup") =>
      (database.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as Array<{ name: string }>).map((table) => table.name);
    const liveTables = listTables("main");
    const backupTables = new Set(listTables("restore_backup"));

    const keptTables = showcase ? showcaseTablesKept : new Set<string>();
    const keptSettingsWhere = showcase ? showcaseSettingsKeptWhere : `key IN (${settingsNotRestored.map((key) => `'${key}'`).join(", ")})`;
    const keptSettings = database
      .prepare(`SELECT key, value, updated_at FROM app_settings WHERE ${keptSettingsWhere}`)
      .all() as Array<{ key: string; value: string; updated_at: string }>;

    database.exec("BEGIN");
    for (const table of liveTables) {
      if (keptTables.has(table)) continue;
      database.exec(`DELETE FROM "${table}"`);
    }
    const restored: string[] = [];
    for (const table of liveTables) {
      if (keptTables.has(table) || tablesNotRestored.has(table) || !backupTables.has(table)) continue;
      const backupColumns = new Set(tableColumns(database, "restore_backup", table));
      const columns = tableColumns(database, "main", table).filter((column) => backupColumns.has(column));
      if (!columns.length) continue;
      const list = columns.map((column) => `"${column}"`).join(", ");
      database.exec(`INSERT INTO "${table}" (${list}) SELECT ${list} FROM restore_backup."${table}"`);
      restored.push(table);
    }
    database.exec(`DELETE FROM app_settings WHERE ${keptSettingsWhere}`);
    const keepSetting = database.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES (@key, @value, @updated_at)");
    for (const row of keptSettings) keepSetting.run(row);
    const restoredList = restored.map((table) => `'${table}'`).join(", ");
    if (restoredList) {
      database.exec(`DELETE FROM sqlite_sequence WHERE name IN (${restoredList})`);
      const hasBackupSequence = database.prepare("SELECT 1 FROM restore_backup.sqlite_master WHERE name = 'sqlite_sequence'").get();
      if (hasBackupSequence) {
        database.exec(`
          INSERT INTO sqlite_sequence (name, seq)
          SELECT name, seq FROM restore_backup.sqlite_sequence
          WHERE name IN (${restoredList});
        `);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // Ignore rollback failures so the original restore error is returned.
    }
    throw error;
  } finally {
    database.exec("DETACH DATABASE restore_backup");
    database.pragma("foreign_keys = ON");
  }
}

async function validateAndSummariseZip(buffer: Buffer, token: string, extractDir: string): Promise<RestoreSummary> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (!entries.length) throw new Error("Backup zip is empty.");

  for (const entry of entries) {
    if (!isSafeZipPath(entry.entryName)) {
      throw new Error("Backup contains an unsafe file path.");
    }
  }

  const manifestEntry = zip.getEntry("manifest.json");
  if (!manifestEntry) throw new Error("Backup is missing manifest.json.");
  const manifest = JSON.parse(manifestEntry.getData().toString("utf8")) as BackupManifest;
  if (manifest.app !== "Carvey" || manifest.formatVersion !== backupFormatVersion || manifest.database !== dbFileName) {
    throw new Error("Backup format is not supported.");
  }
  if (!Array.isArray(manifest.uploads) || manifest.uploads.some((upload) => typeof upload !== "string" || !isSafeRelativePath(upload))) {
    throw new Error("Backup manifest contains an unsafe upload path.");
  }
  if (!zip.getEntry(dbFileName)) throw new Error("Backup is missing carvey.sqlite.");

  await fsp.rm(extractDir, { recursive: true, force: true });
  await fsp.mkdir(extractDir, { recursive: true });
  zip.extractAllTo(extractDir, true);

  const backupDb = new Database(path.join(extractDir, dbFileName), { readonly: true, fileMustExist: true });
  try {
    const counts = {
      vehicles: countRows(backupDb, "vehicles"),
      maintenance: countRows(backupDb, "maintenance_records"),
      repairs: countRows(backupDb, "repair_records"),
      mots: countRows(backupDb, "mot_records"),
      reminders: countRows(backupDb, "reminders"),
      plannedPurchases: countRows(backupDb, "planned_purchases"),
      fuel: countRows(backupDb, "fuel_records"),
      renewals: countRows(backupDb, "renewals")
    };
    return {
      token,
      createdAt: manifest.createdAt,
      appVersion: manifest.appVersion,
      formatVersion: manifest.formatVersion,
      uploadCount: manifest.uploads.length,
      counts
    };
  } finally {
    backupDb.close();
  }
}

function countRows(database: Database.Database, table: string) {
  const exists = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  if (!exists) return 0;
  const row = database.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  return row.count;
}

async function createRollbackSnapshot() {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const rollbackDir = path.join(restoreRollbackDir, timestamp);
  await fsp.mkdir(rollbackDir, { recursive: true });
  await getDb().backup(path.join(rollbackDir, dbFileName));
  await copyDir(uploadDir, path.join(rollbackDir, "uploads"));
  return rollbackDir;
}

async function writeCurrentDataToShowcaseDemoBackup() {
  ensureDataDirs();
  await fsp.mkdir(path.dirname(showcaseDemoBackupPath), { recursive: true });
  const { buffer } = await createBackupZip({ showcase: true });
  const tempPath = `${showcaseDemoBackupPath}.tmp`;
  await fsp.writeFile(tempPath, buffer);
  await fsp.rename(tempPath, showcaseDemoBackupPath);
}

async function restoreExtractedBackup(extractDir: string, showcase = false) {
  restoreDatabaseContents(path.join(extractDir, dbFileName), showcase);
  await fsp.rm(uploadDir, { recursive: true, force: true });
  await fsp.mkdir(uploadDir, { recursive: true });
  await copyDir(path.join(extractDir, "uploads"), uploadDir);
  ensureDataDirs();
}

async function restoreValidatedBackupBuffer(buffer: Buffer, token: string, extractDir: string, showcase = false) {
  try {
    await validateAndSummariseZip(buffer, token, extractDir);
    await restoreExtractedBackup(extractDir, showcase);
  } finally {
    await fsp.rm(extractDir, { recursive: true, force: true });
  }
}

async function readBackupSummaryFromFile(filePath: string) {
  const buffer = await readFileIfExists(filePath);
  if (!buffer) return null;
  const extractDir = path.join(tempDir, `backup-summary-${crypto.randomUUID()}`);
  try {
    return await validateAndSummariseZip(buffer, "summary", extractDir);
  } catch {
    return null;
  } finally {
    await fsp.rm(extractDir, { recursive: true, force: true });
  }
}

async function readPackagedDemoBuffer() {
  return readFileIfExists(showcaseDemoBackupPath);
}

async function readDebugDemoState(): Promise<DebugDemoState> {
  const buffer = await readFileIfExists(debugDemoStatePath);
  if (!buffer) return { active: false, activatedAt: null };
  try {
    const parsed = JSON.parse(buffer.toString("utf8")) as Partial<DebugDemoState>;
    return {
      active: parsed.active === true,
      activatedAt: typeof parsed.activatedAt === "string" ? parsed.activatedAt : null
    };
  } catch {
    return { active: false, activatedAt: null };
  }
}

async function writeDebugDemoState(state: DebugDemoState) {
  await fsp.mkdir(debugDemoDir, { recursive: true });
  await fsp.writeFile(debugDemoStatePath, JSON.stringify(state, null, 2));
}

async function readFileIfExists(filePath: string) {
  try {
    return await fsp.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listUploadFiles() {
  const files: string[] = [];
  await walkUploads(uploadDir, "", files);
  return files.sort();
}

async function walkUploads(root: string, relativeDir: string, files: string[]) {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(path.join(root, relativeDir), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      await walkUploads(root, relativePath, files);
    } else if (entry.isFile()) {
      files.push(relativePath.split(path.sep).join("/"));
    }
  }
}

function isSafeZipPath(entryName: string) {
  return isSafeRelativePath(entryName);
}

function isSafeRelativePath(entryName: string) {
  if (!entryName || entryName.includes("\\") || path.posix.isAbsolute(entryName)) return false;
  const parts = entryName.split("/");
  return parts.every((part) => part && part !== "." && part !== "..") && path.posix.normalize(entryName) === entryName;
}

function isSafeToken(token: string) {
  return /^[a-f0-9-]{36}$/i.test(token);
}

async function copyDir(from: string, to: string) {
  try {
    const entries = await fsp.readdir(from, { withFileTypes: true });
    await fsp.mkdir(to, { recursive: true });
    for (const entry of entries) {
      const source = path.join(from, entry.name);
      const target = path.join(to, entry.name);
      if (entry.isDirectory()) {
        await copyDir(source, target);
      } else if (entry.isFile()) {
        await fsp.copyFile(source, target);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
