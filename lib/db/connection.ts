import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import { dataDir, ensureDataDirs } from "../paths";
import { migrate } from "./schema";

let db: Database.Database | null = null;
export const dbFileName = "carvey.sqlite";

/**
 * Recovery levers for locked-out admins who can only edit the container's environment:
 * CARVEY_RESET_PASSWORD sets a new password, CARVEY_RESET_2FA=true turns two-factor off.
 * Either one also signs out every existing session.
 */
function applyStartupRecovery(database: Database.Database) {
  const newPassword = process.env.CARVEY_RESET_PASSWORD;
  const reset2fa = process.env.CARVEY_RESET_2FA === "true";
  if (!newPassword && !reset2fa) return;
  const user = database.prepare("SELECT id, username FROM admin_users ORDER BY id LIMIT 1").get() as { id: number; username: string } | undefined;
  if (!user) return;
  if (newPassword) {
    database.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(newPassword, 12), user.id);
    console.log(`[Carvey] CARVEY_RESET_PASSWORD was set — password reset for user "${user.username}". Remove the env var before restarting.`);
  }
  if (reset2fa) {
    database.prepare("UPDATE admin_users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_counter = NULL, totp_pending_secret = NULL, recovery_codes = NULL WHERE id = ?").run(user.id);
    console.log(`[Carvey] CARVEY_RESET_2FA was set — two-factor authentication turned off for "${user.username}". Remove the env var before restarting.`);
  }
  database.prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE revoked_at IS NULL").run();
}

function openDb() {
  ensureDataDirs();
  const database = new Database(path.join(dataDir, dbFileName));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  applyStartupRecovery(database);
  return database;
}

export function getDb() {
  db ??= openDb();
  return db;
}

export function closeDbForTests() {
  db?.close();
  db = null;
}

export function closeDb() {
  closeDbForTests();
}
