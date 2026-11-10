import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.CARVEY_DATA_DIR ?? path.join(rootDir, "data"));
const outputPath = path.join(rootDir, "data/demo/showcase-backup.zip");
const dbPath = path.join(dataDir, "carvey.sqlite");
const uploadsDir = path.join(dataDir, "uploads");

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-showcase-backup-"));
const backupDbPath = path.join(workDir, "carvey.sqlite");

const db = new Database(dbPath, { fileMustExist: true });
await db.backup(backupDbPath);
db.close();
scrubShowcaseCopy(backupDbPath);

const uploads = await listUploadFiles(uploadsDir);
const manifest = {
  app: "Carvey",
  appVersion: "0.1.0",
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  database: "carvey.sqlite",
  uploads
};

const zip = new AdmZip();
zip.addLocalFile(backupDbPath, "", "carvey.sqlite");
zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
for (const relativePath of uploads) {
  zip.addLocalFile(path.join(uploadsDir, relativePath), "uploads", relativePath);
}

await fs.writeFile(outputPath, zip.toBuffer());
await fs.rm(workDir, { recursive: true, force: true });
console.log(`Wrote ${outputPath} from ${dataDir}`);

async function listUploadFiles(root) {
  const files = [];
  await walkUploads(root, "", files);
  return files.sort();
}

async function walkUploads(root, relativeDir, files) {
  let entries;
  try {
    entries = await fs.readdir(path.join(root, relativeDir), { withFileTypes: true });
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

/**
 * This zip is committed to a public repository, so it must not carry the account, sign-in state,
 * notification history or private settings of the instance it came from. Keep in step with
 * showcaseTablesKept and showcaseSettingsKeptWhere in lib/backup.ts.
 */
function scrubShowcaseCopy(filePath) {
  const copy = new Database(filePath);
  try {
    for (const table of ["admin_users", "notification_log", "auth_sessions", "auth_challenges", "auth_throttle"]) {
      const exists = copy.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
      if (exists) copy.exec(`DELETE FROM "${table}"`);
    }
    copy.exec("DELETE FROM app_settings WHERE key LIKE 'notify.%' OR key LIKE 'calendar.%' OR key = 'authDisabled'");
    copy.exec("VACUUM");
  } finally {
    copy.close();
  }
}
