import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMock = vi.hoisted(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn()
}));

const headerMock = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieMock),
  headers: vi.fn(async () => headerMock)
}));

async function freshModules(prefix = "carvey-auth-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  process.env.CARVEY_DATA_DIR = dir;
  vi.resetModules();
  const db = await import("@/lib/db");
  const auth = await import("@/lib/auth");
  return { dir, db, auth };
}

describe("auth helpers", () => {
  beforeEach(() => {
    cookieMock.set.mockReset();
    cookieMock.delete.mockReset();
    cookieMock.get.mockReset();
    headerMock.get.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("creates persisted opaque sessions on login", async () => {
    const { auth, db } = await freshModules();
    const hash = await bcrypt.hash("password-123", 4);
    const userId = Number(db.createAdminUser("admin", hash).lastInsertRowid);

    await expect(auth.login("admin", "password-123")).resolves.toBe(true);
    expect(cookieMock.set).toHaveBeenCalledWith("carvey_session", expect.stringMatching(/^[a-f0-9]{48}$/), expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    }));

    const sessionId = cookieMock.set.mock.calls[0][1] as string;
    expect(db.getAuthSession(sessionId)).toMatchObject({
      id: sessionId,
      adminUserId: userId,
      revokedAt: null
    });
    db.closeDbForTests();
  });

  it("resolves the current user from a valid session cookie", async () => {
    const { auth, db } = await freshModules();
    const hash = await bcrypt.hash("password-123", 4);
    const userId = Number(db.createAdminUser("admin", hash).lastInsertRowid);
    const sessionId = auth.createSessionToken();
    db.createAuthSession(sessionId, userId, new Date(Date.now() + 60_000).toISOString());
    cookieMock.get.mockReturnValue({ value: sessionId });

    await expect(auth.currentUser()).resolves.toMatchObject({ id: userId, username: "admin" });
    db.closeDbForTests();
  });

  it("rejects malformed, expired, revoked, and missing sessions", async () => {
    const { auth, db } = await freshModules();
    const hash = await bcrypt.hash("password-123", 4);
    const userId = Number(db.createAdminUser("admin", hash).lastInsertRowid);
    const expiredSession = auth.createSessionToken();
    const revokedSession = auth.createSessionToken();
    db.createAuthSession(expiredSession, userId, new Date(Date.now() - 1000).toISOString());
    db.createAuthSession(revokedSession, userId, new Date(Date.now() + 60_000).toISOString());
    db.revokeAuthSession(revokedSession);

    cookieMock.get.mockReturnValue(undefined);
    await expect(auth.currentUser()).resolves.toBeNull();

    cookieMock.get.mockReturnValue({ value: "not-a-session" });
    await expect(auth.currentUser()).resolves.toBeNull();

    cookieMock.get.mockReturnValue({ value: expiredSession });
    await expect(auth.currentUser()).resolves.toBeNull();

    cookieMock.get.mockReturnValue({ value: revokedSession });
    await expect(auth.currentUser()).resolves.toBeNull();
    db.closeDbForTests();
  });

  it("revokes only the active session on logout", async () => {
    const { auth, db } = await freshModules();
    const hash = await bcrypt.hash("password-123", 4);
    const userId = Number(db.createAdminUser("admin", hash).lastInsertRowid);
    const activeSession = auth.createSessionToken();
    const otherSession = auth.createSessionToken();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    db.createAuthSession(activeSession, userId, expiresAt);
    db.createAuthSession(otherSession, userId, expiresAt);
    cookieMock.get.mockReturnValue({ value: activeSession });

    await auth.logout();

    expect(cookieMock.delete).toHaveBeenCalledWith("carvey_session");
    expect(db.getAuthSession(activeSession)?.revokedAt).toEqual(expect.any(String));
    expect(db.getAuthSession(otherSession)?.revokedAt).toBeNull();
    db.closeDbForTests();
  });

  it("keeps sessions valid across module restarts", async () => {
    const first = await freshModules("carvey-auth-persist-");
    const hash = await bcrypt.hash("password-123", 4);
    const userId = Number(first.db.createAdminUser("admin", hash).lastInsertRowid);
    const sessionId = first.auth.createSessionToken();
    first.db.createAuthSession(sessionId, userId, new Date(Date.now() + 60_000).toISOString());
    first.db.closeDbForTests();

    vi.resetModules();
    process.env.CARVEY_DATA_DIR = first.dir;
    const auth = await import("@/lib/auth");
    const db = await import("@/lib/db");
    cookieMock.get.mockReturnValue({ value: sessionId });

    await expect(auth.currentUser()).resolves.toMatchObject({ id: userId, username: "admin" });
    db.closeDbForTests();
  });

  it("marks cookies secure when production requests arrive over HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { auth, db } = await freshModules();
    const hash = await bcrypt.hash("password-123", 4);
    db.createAdminUser("admin", hash);
    headerMock.get.mockImplementation((name: string) => name === "x-forwarded-proto" ? "https" : null);

    await expect(auth.login("admin", "password-123")).resolves.toBe(true);

    expect(cookieMock.set).toHaveBeenCalledWith("carvey_session", expect.any(String), expect.objectContaining({
      secure: true
    }));
    db.closeDbForTests();
  });
});
