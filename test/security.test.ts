import AdmZip from "adm-zip";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSameOriginRequest } from "@/lib/security/request";
import { base32Decode, base32Encode, generateRecoveryCodes, hashRecoveryCode, otpauthUri, totpCode, totpCounter, verifyTotp } from "@/lib/security/totp";

const jar = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    get: vi.fn((name: string) => (values.has(name) ? { value: values.get(name)! } : undefined)),
    set: vi.fn((name: string, value: string) => void values.set(name, value)),
    delete: vi.fn((name: string) => void values.delete(name))
  };
});
const requestHeaders = vi.hoisted(() => {
  const values = new Map<string, string>();
  return { values, get: vi.fn((name: string) => values.get(name.toLowerCase()) ?? null) };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => jar),
  headers: vi.fn(async () => requestHeaders)
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  })
}));

async function freshModules() {
  process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-security-"));
  vi.resetModules();
  const db = await import("@/lib/db");
  const auth = await import("@/lib/auth");
  const twoFactor = await import("@/lib/two-factor");
  const userId = Number(db.createAdminUser("admin", await bcrypt.hash("correct-horse", 4)).lastInsertRowid);
  return { db, auth, twoFactor, userId };
}

/** Turns on 2FA for the user and returns the secret. */
function enrol(db: Awaited<ReturnType<typeof freshModules>>["db"], twoFactor: Awaited<ReturnType<typeof freshModules>>["twoFactor"], userId: number) {
  const { secret } = twoFactor.beginTotpSetup(db.getAdminById(userId)!);
  const result = twoFactor.confirmTotpSetup(userId, totpCode(secret, totpCounter() - 1), null);
  if (!result.ok) throw new Error("enrol failed");
  return { secret, recoveryCodes: result.recoveryCodes };
}

describe("TOTP", () => {
  it("matches the RFC 6238 SHA-1 test vectors", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(totpCode(secret, Math.floor(59 / 30))).toBe("287082");
    expect(totpCode(secret, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(secret, Math.floor(2000000000 / 30))).toBe("279037");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });

  it("allows one step of drift and refuses reuse", () => {
    const secret = base32Encode(Buffer.from("abcdefghijabcdefghij"));
    const now = 1_700_000_000_000;
    const counter = totpCounter(now);
    expect(verifyTotp(secret, totpCode(secret, counter - 1), { now })).toBe(counter - 1);
    expect(verifyTotp(secret, totpCode(secret, counter + 1), { now })).toBe(counter + 1);
    expect(verifyTotp(secret, totpCode(secret, counter - 2), { now })).toBeNull();
    expect(verifyTotp(secret, totpCode(secret, counter), { now, lastUsedCounter: counter })).toBeNull();
    expect(verifyTotp(secret, "12345", { now })).toBeNull();
    expect(otpauthUri(secret, "admin")).toMatch(/^otpauth:\/\/totp\/Carvey%3Aadmin\?secret=/);
  });

  it("makes unique, normalisable recovery codes", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
    expect(hashRecoveryCode(codes[0].toUpperCase().replace("-", " "))).toBe(hashRecoveryCode(codes[0]));
  });
});

describe("sign-in", () => {
  beforeEach(() => {
    jar.values.clear();
    requestHeaders.values.clear();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("locks an account after repeated failures, the same way for unknown usernames", async () => {
    const { auth, db } = await freshModules();
    for (let i = 0; i < 5; i++) expect(await auth.login("admin", "wrong")).toEqual({ status: "invalid" });
    expect(await auth.login("admin", "correct-horse")).toMatchObject({ status: "throttled", retryAfterSeconds: expect.any(Number) });
    for (let i = 0; i < 5; i++) await auth.login("ghost", "wrong");
    expect(await auth.login("ghost", "anything")).toMatchObject({ status: "throttled" });
    // Another client (behind a proxy) isn't locked out by the first one's failures.
    requestHeaders.values.set("x-forwarded-for", "203.0.113.9");
    expect(await auth.login("admin", "correct-horse")).toEqual({ status: "ok" });
    db.closeDbForTests();
  });

  it("asks for a second factor and accepts each code only once", async () => {
    const { auth, db, twoFactor, userId } = await freshModules();
    const { secret } = enrol(db, twoFactor, userId);

    expect(await auth.login("admin", "correct-horse")).toEqual({ status: "two-factor" });
    expect(jar.values.has("carvey_session")).toBe(false);
    expect(await auth.currentUser()).toBeNull();

    const reused = totpCode(secret, totpCounter() - 1); // already used during enrolment
    expect(await auth.completeSecondFactor(reused)).toMatchObject({ status: "invalid" });
    expect(await auth.completeSecondFactor(totpCode(secret, totpCounter()))).toMatchObject({ status: "ok", usedRecoveryCode: false });
    expect(jar.values.has("carvey_2fa")).toBe(false);
    expect(await auth.currentUser()).toMatchObject({ id: userId, method: "session" });

    // The same code can't start a second session.
    jar.values.clear();
    await auth.login("admin", "correct-horse");
    expect(await auth.completeSecondFactor(totpCode(secret, totpCounter()))).toMatchObject({ status: "invalid" });
    db.closeDbForTests();
  });

  it("accepts each recovery code once and ends the challenge after five wrong codes", async () => {
    const { auth, db, twoFactor, userId } = await freshModules();
    const { recoveryCodes } = enrol(db, twoFactor, userId);

    await auth.login("admin", "correct-horse");
    expect(await auth.completeSecondFactor(recoveryCodes[3].toUpperCase())).toEqual({ status: "ok", usedRecoveryCode: true, recoveryCodesLeft: 9 });

    jar.values.clear();
    await auth.login("admin", "correct-horse");
    expect(await auth.completeSecondFactor(recoveryCodes[3])).toMatchObject({ status: "invalid" });
    for (let i = 0; i < 3; i++) await auth.completeSecondFactor("000000");
    expect(await auth.completeSecondFactor("000000")).toEqual({ status: "expired" });
    expect(await auth.completeSecondFactor(recoveryCodes[4])).toEqual({ status: "expired" });
    db.closeDbForTests();
  });

  it("requires the password and a code to turn two-factor off, and signs out other devices", async () => {
    const { auth, db, twoFactor, userId } = await freshModules();
    const { secret } = enrol(db, twoFactor, userId);
    const other = auth.createSessionToken();
    db.createAuthSession(other, userId, new Date(Date.now() + 60_000).toISOString());

    expect(await twoFactor.disableTwoFactor(userId, "wrong", totpCode(secret, totpCounter()), null)).toMatchObject({ ok: false, reason: "password" });
    expect(await twoFactor.disableTwoFactor(userId, "correct-horse", "111111", null)).toMatchObject({ ok: false, reason: "code" });
    expect(await twoFactor.disableTwoFactor(userId, "correct-horse", totpCode(secret, totpCounter()), null)).toEqual({ ok: true });
    expect(twoFactor.isTwoFactorEnabled(db.getAdminById(userId)!)).toBe(false);
    expect(db.getAuthSession(other)?.revokedAt).toEqual(expect.any(String));
    db.closeDbForTests();
  });

  it("signs out other sessions when the password changes", async () => {
    const { auth, db, userId } = await freshModules();
    await auth.login("admin", "correct-horse");
    const current = await auth.currentUser();
    const other = auth.createSessionToken();
    db.createAuthSession(other, userId, new Date(Date.now() + 60_000).toISOString());

    expect(await auth.changePassword(userId, "correct-horse", "battery-staple", current!.sessionId)).toBe(true);
    expect(db.getAuthSession(other)?.revokedAt).toEqual(expect.any(String));
    expect(await auth.currentUser()).toMatchObject({ id: userId });
    db.closeDbForTests();
  });

  it("upgrades sessions stored before tokens were hashed without logging anyone out", async () => {
    const { auth, db, userId } = await freshModules();
    const token = auth.createSessionToken();
    db.getDb().prepare("INSERT INTO auth_sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, new Date(Date.now() + 60_000).toISOString());
    jar.values.set("carvey_session", token);
    expect(await auth.currentUser()).toMatchObject({ id: userId });
    expect(db.getDb().prepare("SELECT id FROM auth_sessions").all()).toEqual([{ id: db.hashToken(token) }]);
    db.closeDbForTests();
  });

  it("only lets the first setup request create the admin", async () => {
    process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-setup-"));
    vi.resetModules();
    const db = await import("@/lib/db");
    const auth = await import("@/lib/auth");
    const results = await Promise.allSettled([auth.createFirstAdmin("first", "password-1"), auth.createFirstAdmin("second", "password-2")]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(db.getDb().prepare("SELECT COUNT(*) as count FROM admin_users").get()).toEqual({ count: 1 });
    db.closeDbForTests();
  });
});

describe("auth modes", () => {
  beforeEach(() => {
    jar.values.clear();
    requestHeaders.values.clear();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps the legacy Settings toggle working, but lets the environment override it", async () => {
    const { auth, db } = await freshModules();
    db.setAppSetting("authDisabled", "true");
    expect(auth.getAuthConfig()).toEqual({ mode: "none", source: "settings" });
    expect(await auth.currentUser()).toMatchObject({ id: 0, method: "none" });
    vi.stubEnv("CARVEY_AUTH_MODE", "password");
    expect(auth.getAuthConfig()).toEqual({ mode: "password", source: "env" });
    expect(await auth.currentUser()).toBeNull();
    db.closeDbForTests();
  });

  it("trusts the proxy only with the shared secret, and falls back to password sign-in without it", async () => {
    vi.stubEnv("CARVEY_AUTH_MODE", "proxy");
    vi.stubEnv("CARVEY_PROXY_SECRET", "a-long-shared-secret-value");
    vi.stubEnv("CARVEY_PROXY_USER_HEADER", "Remote-User");
    const { auth, db, userId } = await freshModules();

    // Direct access (no secret) with a forged user header gets nothing.
    requestHeaders.values.set("remote-user", "mallory");
    expect(await auth.currentUser()).toBeNull();
    requestHeaders.values.set("x-carvey-proxy-secret", "wrong-secret-value-0000");
    expect(await auth.currentUser()).toBeNull();

    requestHeaders.values.set("x-carvey-proxy-secret", "a-long-shared-secret-value");
    expect(await auth.currentUser()).toMatchObject({ id: userId, method: "proxy", proxyUser: "mallory" });
    requestHeaders.values.delete("remote-user");
    expect(await auth.currentUser()).toBeNull();

    // A normal password session still works when the proxy is bypassed.
    requestHeaders.values.clear();
    await auth.login("admin", "correct-horse");
    expect(await auth.currentUser()).toMatchObject({ id: userId, method: "session" });
    db.closeDbForTests();
  });

  it("refuses proxy mode with a missing or short secret", async () => {
    vi.stubEnv("CARVEY_AUTH_MODE", "proxy");
    vi.stubEnv("CARVEY_PROXY_SECRET", "short");
    const { auth, db } = await freshModules();
    expect(auth.getAuthConfig()).toMatchObject({ mode: "password", source: "env", problem: expect.stringContaining("CARVEY_PROXY_SECRET") });
    db.closeDbForTests();
  });
});

describe("cross-site requests", () => {
  const headersOf = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

  it("accepts same-origin requests, including behind a proxy", () => {
    expect(isSameOriginRequest(headersOf({ host: "carvey.lan:3000", origin: "http://carvey.lan:3000" }))).toBe(true);
    expect(isSameOriginRequest(headersOf({ host: "carvey:3000", "x-forwarded-host": "cars.example.com", origin: "https://cars.example.com" }))).toBe(true);
    expect(isSameOriginRequest(headersOf({ host: "carvey.lan", "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("rejects other origins, sibling subdomains and requests with no origin", () => {
    expect(isSameOriginRequest(headersOf({ host: "cars.example.com", origin: "https://evil.example.com" }))).toBe(false);
    expect(isSameOriginRequest(headersOf({ host: "cars.example.com", origin: "https://cars.example.com", "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameOriginRequest(headersOf({ host: "cars.example.com" }))).toBe(false);
    expect(isSameOriginRequest(headersOf({ host: "cars.example.com", origin: "null" }))).toBe(false);
  });
});

describe("backups", () => {
  beforeEach(() => vi.resetModules());

  it("never contain sessions, and restoring one doesn't change the sign-in mode", async () => {
    const { auth, db, userId } = await freshModules();
    const token = auth.createSessionToken();
    db.createAuthSession(token, userId, new Date(Date.now() + 60_000).toISOString());
    db.setAppSetting("authDisabled", "true");
    const backup = await import("@/lib/backup");
    const { buffer } = await backup.createBackupZip();

    const dbEntry = new AdmZip(buffer).getEntry("carvey.sqlite")!;
    const copyPath = path.join(process.env.CARVEY_DATA_DIR!, "inspect.sqlite");
    await fs.writeFile(copyPath, dbEntry.getData());
    const copy = new Database(copyPath, { readonly: true });
    expect(copy.prepare("SELECT COUNT(*) as count FROM auth_sessions").get()).toEqual({ count: 0 });
    copy.close();

    // Restore that backup (which says "sign-in off") onto a server with sign-in on.
    db.setAppSetting("authDisabled", "false");
    const preview = await backup.stageRestorePreview(new File([new Uint8Array(buffer)], "b.zip"));
    if (!preview.ok) throw new Error(preview.message);
    expect(await backup.confirmRestore(preview.summary.token)).toMatchObject({ ok: true });
    expect(db.getAppSetting("authDisabled")).toBe("false");
    db.closeDbForTests();
  });
});
