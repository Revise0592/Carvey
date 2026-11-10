import { getDb } from "./connection";

export function hasNotificationBeenSent(key: string) {
  return Boolean(getDb().prepare("SELECT 1 FROM notification_log WHERE key = ?").get(key));
}

export function markNotificationsSent(keys: string[]) {
  const db = getDb();
  const insert = db.prepare("INSERT OR IGNORE INTO notification_log (key) VALUES (?)");
  db.transaction(() => {
    for (const key of keys) insert.run(key);
  })();
}

/** Drops log rows older than a year; their due dates have long passed. */
export function pruneNotificationLog() {
  return getDb().prepare("DELETE FROM notification_log WHERE sent_at < datetime('now', '-400 days')").run();
}
