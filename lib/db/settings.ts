import { getDb } from "./connection";

export const defaultCollectionName = "My cars";

// ─── App settings ───────────────────────────────────────────────────────────

export function getAppSetting(key: string) {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/** All settings in one query, for callers that read several keys at once. */
export function getAppSettings(): Map<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM app_settings").all() as Array<{ key: string; value: string }>;
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function setAppSetting(key: string, value: string) {
  return getDb()
    .prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .run(key, value);
}

export function deleteAppSetting(key: string) {
  return getDb().prepare("DELETE FROM app_settings WHERE key = ?").run(key);
}

export function getCollectionName() {
  return getAppSetting("collectionName") ?? defaultCollectionName;
}

export function updateCollectionName(name: string) {
  return setAppSetting("collectionName", name);
}
