import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import readline from "node:readline/promises";

const dataDir = path.resolve(process.env.CARVEY_DATA_DIR ?? path.join(process.cwd(), "data"));
const dbPath = path.join(dataDir, "carvey.sqlite");

const db = new Database(dbPath);

const user = db.prepare("SELECT id, username FROM admin_users LIMIT 1").get();
if (!user) {
  console.error("No admin user found. Run the app first to complete setup.");
  process.exit(1);
}

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

const passwordHash = await bcrypt.hash(password, 12);
db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(passwordHash, user.id);

console.log("Password reset successfully. You can now log in with the new password.");
