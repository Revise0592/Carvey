// Account recovery from inside the container:
//   node scripts/reset-password.mjs                 set a new password
//   node scripts/reset-password.mjs --disable-2fa   turn two-factor off (keeps the password)
//   node scripts/reset-password.mjs --disable-2fa --password   both
// Either way, every signed-in session is signed out.
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import readline from "node:readline/promises";

const args = new Set(process.argv.slice(2));
const disable2fa = args.has("--disable-2fa");
const resetPassword = !disable2fa || args.has("--password");

const dataDir = path.resolve(process.env.CARVEY_DATA_DIR ?? path.join(process.cwd(), "data"));
const db = new Database(path.join(dataDir, "carvey.sqlite"));

const user = db.prepare("SELECT id, username FROM admin_users ORDER BY id LIMIT 1").get();
if (!user) {
  console.error("No admin user found. Run the app first to complete setup.");
  process.exit(1);
}

const columns = new Set(db.prepare("PRAGMA table_info(admin_users)").all().map((column) => column.name));

if (resetPassword) {
  console.log(`Resetting password for user: ${user.username}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("New password (min 8 characters): ");
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    rl.close();
    process.exit(1);
  }
  const confirm = await rl.question("Confirm new password: ");
  rl.close();
  if (password !== confirm) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(await bcrypt.hash(password, 12), user.id);
  console.log("Password reset.");
}

if (disable2fa) {
  if (columns.has("totp_secret")) {
    db.prepare("UPDATE admin_users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_counter = NULL, totp_pending_secret = NULL, recovery_codes = NULL WHERE id = ?").run(user.id);
  }
  console.log(`Two-factor authentication turned off for ${user.username}. Set it up again in Settings → Admin.`);
}

db.prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE revoked_at IS NULL").run();
console.log("All existing sessions have been signed out. You can now log in.");
