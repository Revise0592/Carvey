import { getDb } from "./connection";

export type AuditEntry = { id: number; at: string; event: string; detail: string | null; client: string | null; userAgent: string | null };

const keepRows = 1000;

export function insertAuditEntry(entry: { event: string; detail: string | null; client: string | null; userAgent: string | null }) {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO audit_log (event, detail, client, user_agent) VALUES (@event, @detail, @client, @userAgent)")
    .run({ ...entry, detail: entry.detail?.slice(0, 500) ?? null, userAgent: entry.userAgent?.slice(0, 300) ?? null });
  // Trim occasionally rather than on every insert.
  if (Number(result.lastInsertRowid) % 100 === 0) {
    db.prepare("DELETE FROM audit_log WHERE id <= ?").run(Number(result.lastInsertRowid) - keepRows);
  }
}

export function listAuditEntries(limit = 50) {
  return getDb()
    .prepare("SELECT id, at, event, detail, client, user_agent as userAgent FROM audit_log ORDER BY id DESC LIMIT ?")
    .all(limit) as AuditEntry[];
}
