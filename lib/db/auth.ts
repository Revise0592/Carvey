import crypto from "node:crypto";
import { getDb } from "./connection";
import type { AdminUser, AuthSession } from "./types";

/**
 * Session and challenge tokens are stored as SHA-256 digests, never as the cookie value, so a
 * copy of the database (or a backup) can't be replayed as a login.
 */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const adminSelect = `
  id, username, password_hash as passwordHash, created_at as createdAt,
  totp_secret as totpSecret, totp_enabled_at as totpEnabledAt, totp_last_counter as totpLastCounter,
  totp_pending_secret as totpPendingSecret, recovery_codes as recoveryCodes
`;

// ─── Admin users ────────────────────────────────────────────────────────────

export function hasAdminUser() {
  return Boolean(getDb().prepare("SELECT id FROM admin_users LIMIT 1").get());
}

export function createAdminUser(username: string, passwordHash: string) {
  return getDb()
    .prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
}

/** Creates the admin only if none exists, atomically, so two setup requests can't both win. */
export function createFirstAdminUser(username: string, passwordHash: string) {
  const result = getDb()
    .prepare("INSERT INTO admin_users (username, password_hash) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM admin_users)")
    .run(username, passwordHash);
  return result.changes === 1;
}

export function getAdminByUsername(username: string) {
  return getDb()
    .prepare(`SELECT ${adminSelect} FROM admin_users WHERE username = ?`)
    .get(username) as AdminUser | undefined;
}

export function getAdminById(id: number) {
  return getDb()
    .prepare(`SELECT ${adminSelect} FROM admin_users WHERE id = ?`)
    .get(id) as AdminUser | undefined;
}

export function getFirstAdmin() {
  return getDb().prepare(`SELECT ${adminSelect} FROM admin_users ORDER BY id LIMIT 1`).get() as AdminUser | undefined;
}

export function updateAdminUsername(id: number, username: string) {
  return getDb()
    .prepare("UPDATE admin_users SET username = ? WHERE id = ?")
    .run(username, id);
}

export function updateAdminPassword(id: number, passwordHash: string) {
  return getDb()
    .prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
    .run(passwordHash, id);
}

// ─── Two-factor ─────────────────────────────────────────────────────────────

export function setPendingTotpSecret(id: number, secret: string | null) {
  return getDb().prepare("UPDATE admin_users SET totp_pending_secret = ? WHERE id = ?").run(secret, id);
}

export function enableTotp(id: number, secret: string, counter: number, recoveryCodeHashes: string[]) {
  return getDb()
    .prepare(`
      UPDATE admin_users
      SET totp_secret = ?, totp_enabled_at = CURRENT_TIMESTAMP, totp_last_counter = ?,
          totp_pending_secret = NULL, recovery_codes = ?
      WHERE id = ?
    `)
    .run(secret, counter, JSON.stringify(recoveryCodeHashes), id);
}

export function disableTotp(id: number) {
  return getDb()
    .prepare("UPDATE admin_users SET totp_secret = NULL, totp_enabled_at = NULL, totp_last_counter = NULL, totp_pending_secret = NULL, recovery_codes = NULL WHERE id = ?")
    .run(id);
}

/** Records the last accepted time step; the WHERE clause makes a replay race lose. */
export function recordTotpCounter(id: number, counter: number) {
  const result = getDb()
    .prepare("UPDATE admin_users SET totp_last_counter = ? WHERE id = ? AND (totp_last_counter IS NULL OR totp_last_counter < ?)")
    .run(counter, id, counter);
  return result.changes === 1;
}

export function setRecoveryCodes(id: number, hashes: string[]) {
  return getDb().prepare("UPDATE admin_users SET recovery_codes = ? WHERE id = ?").run(JSON.stringify(hashes), id);
}

/** Removes a recovery code if present. Returns false when it isn't one of the unused codes. */
export function consumeRecoveryCode(id: number, codeHash: string) {
  const db = getDb();
  return db.transaction(() => {
    const row = db.prepare("SELECT recovery_codes as codes FROM admin_users WHERE id = ?").get(id) as { codes: string | null } | undefined;
    const codes = row?.codes ? (JSON.parse(row.codes) as string[]) : [];
    const target = Buffer.from(codeHash);
    const index = codes.findIndex((candidate) => candidate.length === codeHash.length && crypto.timingSafeEqual(Buffer.from(candidate), target));
    if (index === -1) return false;
    codes.splice(index, 1);
    db.prepare("UPDATE admin_users SET recovery_codes = ? WHERE id = ?").run(JSON.stringify(codes), id);
    return true;
  })();
}

// ─── Sessions ───────────────────────────────────────────────────────────────

const sessionSelect = `
  id, admin_user_id as adminUserId, created_at as createdAt, expires_at as expiresAt,
  revoked_at as revokedAt, user_agent as userAgent, last_seen_at as lastSeenAt
`;

export function createAuthSession(token: string, adminUserId: number, expiresAt: string, userAgent: string | null = null) {
  return getDb()
    .prepare("INSERT INTO auth_sessions (id, admin_user_id, expires_at, user_agent, last_seen_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)")
    .run(hashToken(token), adminUserId, expiresAt, userAgent?.slice(0, 300) ?? null);
}

/**
 * Looks a session up by its cookie token. Sessions created before tokens were hashed are stored
 * under the raw token; they're upgraded to the hashed form on first use, so nobody is logged out.
 */
export function getAuthSession(token: string) {
  const db = getDb();
  const hashed = hashToken(token);
  const session = db.prepare(`SELECT ${sessionSelect} FROM auth_sessions WHERE id = ?`).get(hashed) as AuthSession | undefined;
  if (session) return session;
  const legacy = db.prepare(`SELECT ${sessionSelect} FROM auth_sessions WHERE id = ?`).get(token) as AuthSession | undefined;
  if (!legacy) return undefined;
  db.prepare("UPDATE auth_sessions SET id = ? WHERE id = ?").run(hashed, token);
  return { ...legacy, id: hashed };
}

export function touchAuthSession(sessionId: string) {
  return getDb()
    .prepare("UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < datetime('now', '-5 minutes'))")
    .run(sessionId);
}

export function revokeAuthSession(token: string) {
  return getDb()
    .prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id IN (?, ?)")
    .run(hashToken(token), token);
}

export function revokeAuthSessionById(sessionId: string, adminUserId: number) {
  return getDb()
    .prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND admin_user_id = ? AND revoked_at IS NULL")
    .run(sessionId, adminUserId);
}

/** Revokes every session for a user except `keepSessionId` (a stored, hashed id). */
export function revokeOtherAuthSessions(adminUserId: number, keepSessionId: string | null) {
  return getDb()
    .prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE admin_user_id = ? AND revoked_at IS NULL AND id IS NOT ?")
    .run(adminUserId, keepSessionId);
}

export function listActiveAuthSessions(adminUserId: number) {
  return getDb()
    .prepare(`SELECT ${sessionSelect} FROM auth_sessions WHERE admin_user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY COALESCE(last_seen_at, created_at) DESC`)
    .all(adminUserId, new Date().toISOString()) as AuthSession[];
}

export function pruneAuthSessions() {
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare("DELETE FROM auth_sessions WHERE expires_at < ? OR revoked_at < datetime('now', '-30 days')").run(now);
  db.prepare("DELETE FROM auth_challenges WHERE expires_at < ?").run(now);
}

// ─── Second-factor challenges ───────────────────────────────────────────────

export function createAuthChallenge(token: string, adminUserId: number, expiresAt: string) {
  return getDb()
    .prepare("INSERT INTO auth_challenges (id, admin_user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), adminUserId, expiresAt);
}

export function getAuthChallenge(token: string) {
  return getDb()
    .prepare("SELECT id, admin_user_id as adminUserId, expires_at as expiresAt, attempts FROM auth_challenges WHERE id = ?")
    .get(hashToken(token)) as { id: string; adminUserId: number; expiresAt: string; attempts: number } | undefined;
}

export function recordAuthChallengeFailure(challengeId: string) {
  return getDb().prepare("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?").run(challengeId);
}

export function deleteAuthChallenge(challengeId: string) {
  return getDb().prepare("DELETE FROM auth_challenges WHERE id = ?").run(challengeId);
}

// ─── Throttling ─────────────────────────────────────────────────────────────

export type ThrottleState = { failures: number; windowStartedAt: string; lockedUntil: string | null };

export function getThrottle(key: string) {
  return getDb()
    .prepare("SELECT failures, window_started_at as windowStartedAt, locked_until as lockedUntil FROM auth_throttle WHERE key = ?")
    .get(key) as ThrottleState | undefined;
}

export function saveThrottle(key: string, state: ThrottleState) {
  return getDb()
    .prepare(`
      INSERT INTO auth_throttle (key, failures, window_started_at, locked_until) VALUES (@key, @failures, @windowStartedAt, @lockedUntil)
      ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, window_started_at = excluded.window_started_at, locked_until = excluded.locked_until
    `)
    .run({ key, ...state });
}

export function clearThrottle(key: string) {
  return getDb().prepare("DELETE FROM auth_throttle WHERE key = ?").run(key);
}
