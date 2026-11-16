import "server-only";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createAuthChallenge,
  createAuthSession,
  createFirstAdminUser,
  deleteAuthChallenge,
  getAdminById,
  getAdminByUsername,
  getAppSetting,
  getAuthChallenge,
  getAuthSession,
  getFirstAdmin,
  hasAdminUser,
  pruneAuthSessions,
  recordAuthChallengeFailure,
  revokeAuthSession,
  revokeOtherAuthSessions,
  touchAuthSession,
  type AdminUser
} from "./db";
import { changePasswordForAdmin, changeUsernameForAdmin } from "./account";
import { checkSecondFactor } from "./two-factor";
import { issueKnownDeviceToken, knownDeviceCookieName, knownDeviceMaxAgeSeconds, verifyKnownDeviceToken } from "./security/known-device";
import { clientAddress } from "./security/request";
import { clearThrottle, withThrottle, type ThrottleKey } from "./security/throttle";

const cookieName = "carvey_session";
const challengeCookieName = "carvey_2fa";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const sessionMaxAgeMs = sessionMaxAgeSeconds * 1000;
const challengeMaxAgeSeconds = 5 * 60;
const maxChallengeAttempts = 5;

// A real bcrypt hash of a random string: comparing against it for unknown usernames makes a
// failed login take the same time whether or not the account exists.
const timingDummyHash = "$2b$12$s0mj64KVzImjn7N4x.50kuYXKIp2q8XL0kWSxEMSU/4y.1Dp0n96O";

type HeaderLike = {
  get(name: string): string | null;
};

// ─── Modes ──────────────────────────────────────────────────────────────────

export type AuthMode = "password" | "proxy" | "none";

export type AuthConfig = {
  mode: AuthMode;
  /** Where the mode came from: an environment variable, the legacy Settings toggle, or the default. */
  source: "env" | "settings" | "default";
  proxy?: { secretHeader: string; secret: string; userHeader: string | null };
  /** Set when the environment asked for something unsafe or incomplete and Carvey fell back. */
  problem?: string;
};

/**
 * Resolves how requests are authenticated.
 *
 * - `password` (default): username + password, plus TOTP when enabled.
 * - `proxy`: a reverse proxy that handles sign-in (Authelia, Authentik, Cloudflare Access, ...)
 *   proves itself with a shared secret header. Requests without the secret — e.g. someone hitting
 *   the container port directly — still have to sign in with a password.
 * - `none`: no sign-in at all. Kept for existing installs that used the Settings toggle.
 *
 * `CARVEY_AUTH_MODE` wins when set; otherwise the old Settings toggle still works.
 */
export function getAuthConfig(): AuthConfig {
  const envMode = process.env.CARVEY_AUTH_MODE?.trim().toLowerCase();
  if (envMode) {
    if (envMode === "password") return { mode: "password", source: "env" };
    if (envMode === "none" || envMode === "disabled") return { mode: "none", source: "env" };
    if (envMode === "proxy") {
      const secret = process.env.CARVEY_PROXY_SECRET ?? "";
      if (secret.length < 16) {
        return { mode: "password", source: "env", problem: "CARVEY_AUTH_MODE=proxy needs CARVEY_PROXY_SECRET (at least 16 characters). Password sign-in is being used until it is set." };
      }
      return {
        mode: "proxy",
        source: "env",
        proxy: {
          secret,
          secretHeader: (process.env.CARVEY_PROXY_SECRET_HEADER || "x-carvey-proxy-secret").toLowerCase(),
          userHeader: process.env.CARVEY_PROXY_USER_HEADER?.trim().toLowerCase() || null
        }
      };
    }
    return { mode: "password", source: "env", problem: `Unknown CARVEY_AUTH_MODE "${envMode}". Use password, proxy or none. Password sign-in is being used.` };
  }
  if (getAppSetting("authDisabled") === "true") return { mode: "none", source: "settings" };
  return { mode: "password", source: "default" };
}

// ─── Cookies ────────────────────────────────────────────────────────────────

function shouldUseSecureCookies(requestHeaders: HeaderLike | null) {
  if (process.env.CARVEY_SECURE_COOKIES === "true") return true;
  if (process.env.CARVEY_SECURE_COOKIES === "false") return false;
  if (process.env.NODE_ENV !== "production") return false;
  const forwardedProto = requestHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === "https";
  const protocol = requestHeaders?.get("x-forwarded-protocol")?.split(",")[0]?.trim().toLowerCase();
  return protocol === "https";
}

export function buildSessionCookieOptions(requestHeaders: HeaderLike | null = null, maxAge = sessionMaxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(requestHeaders),
    path: "/",
    maxAge
  };
}

export function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function isValidSessionToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[a-f0-9]{48}$/.test(token);
}

function sessionExpiry(now = Date.now()) {
  return new Date(now + sessionMaxAgeMs).toISOString();
}

export function readSession(token: string | undefined, now = Date.now()) {
  if (!isValidSessionToken(token)) return null;
  const session = getAuthSession(token);
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= now) return null;
  return session;
}

export function readSessionUserId(token: string | undefined, now = Date.now()) {
  return readSession(token, now)?.adminUserId ?? null;
}

async function startSession(userId: number) {
  const jar = await cookies();
  const requestHeaders = await headers();
  const token = createSessionToken();
  createAuthSession(token, userId, sessionExpiry(), requestHeaders.get("user-agent"));
  jar.set(cookieName, token, buildSessionCookieOptions(requestHeaders));
  // Remember this browser so a lockout aimed at the account can't shut it out (see known-device.ts).
  if (!verifyKnownDeviceToken(jar.get(knownDeviceCookieName)?.value, userId)) {
    jar.set(knownDeviceCookieName, issueKnownDeviceToken(userId), buildSessionCookieOptions(requestHeaders, knownDeviceMaxAgeSeconds));
  }
  pruneAuthSessions();
}

// ─── Throttling ─────────────────────────────────────────────────────────────

const perClientLimit = 5;
const perAccountLimit = 25;

/**
 * Which counters a sign-in attempt for `username` is charged to. A browser holding a valid
 * known-device cookie for the account has its own counter and is exempt from the account-wide
 * lock; everyone else shares the per-client and per-account limits.
 */
async function throttleKeysFor(username: string, requestHeaders: HeaderLike): Promise<ThrottleKey[]> {
  const account = username.trim().toLowerCase();
  const user = getAdminByUsername(username);
  const deviceId = user ? verifyKnownDeviceToken((await cookies()).get(knownDeviceCookieName)?.value, user.id) : null;
  if (deviceId) return [{ key: `login:${account}:device:${deviceId}`, limit: perClientLimit }];
  return [
    { key: `login:${account}:${clientAddress(requestHeaders)}`, limit: perClientLimit },
    { key: `login:${account}`, limit: perAccountLimit }
  ];
}

// ─── Sign-in ────────────────────────────────────────────────────────────────

export async function createFirstAdmin(username: string, password: string) {
  if (hasAdminUser()) throw new Error("Admin user already exists.");
  const passwordHash = await bcrypt.hash(password, 12);
  if (!createFirstAdminUser(username, passwordHash)) throw new Error("Admin user already exists.");
}

export type LoginResult =
  | { status: "ok" }
  | { status: "two-factor" }
  | { status: "invalid" }
  | { status: "throttled"; retryAfterSeconds: number };

export async function login(username: string, password: string): Promise<LoginResult> {
  const requestHeaders = await headers();
  const keys = await throttleKeysFor(username, requestHeaders);
  const user = getAdminByUsername(username);
  const outcome = await withThrottle(keys, () => bcrypt.compare(password, user?.passwordHash ?? timingDummyHash));
  if (outcome.status === "throttled") return outcome;
  if (outcome.status === "failed" || !user) return { status: "invalid" };

  if (user.totpEnabledAt && user.totpSecret) {
    // The password was right: this client's own counter starts again, but the account-wide one
    // only clears once the second factor is right too.
    clearThrottle(keys[0].key);
    const token = createSessionToken();
    createAuthChallenge(token, user.id, new Date(Date.now() + challengeMaxAgeSeconds * 1000).toISOString());
    const jar = await cookies();
    jar.set(challengeCookieName, token, buildSessionCookieOptions(requestHeaders, challengeMaxAgeSeconds));
    return { status: "two-factor" };
  }

  for (const { key } of keys) clearThrottle(key);
  await startSession(user.id);
  return { status: "ok" };
}

/** The user waiting on a second factor, or null when there's no live challenge. */
export async function pendingChallengeUser() {
  const jar = await cookies();
  const token = jar.get(challengeCookieName)?.value;
  if (!isValidSessionToken(token)) return null;
  const challenge = getAuthChallenge(token);
  if (!challenge || Date.parse(challenge.expiresAt) <= Date.now() || challenge.attempts >= maxChallengeAttempts) return null;
  const user = getAdminById(challenge.adminUserId);
  return user ? { user, challenge } : null;
}

export type SecondFactorResult =
  | { status: "ok"; usedRecoveryCode: boolean; recoveryCodesLeft: number }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "throttled"; retryAfterSeconds: number };

export async function completeSecondFactor(code: string): Promise<SecondFactorResult> {
  const pending = await pendingChallengeUser();
  const jar = await cookies();
  if (!pending) {
    jar.delete(challengeCookieName);
    return { status: "expired" };
  }
  const { user, challenge } = pending;
  const requestHeaders = await headers();
  const keys = await throttleKeysFor(user.username, requestHeaders);
  let check = { ok: false } as ReturnType<typeof checkSecondFactor>;
  const outcome = await withThrottle(keys, () => (check = checkSecondFactor(user, code)).ok);
  if (outcome.status === "throttled") return outcome;
  if (!check.ok) {
    recordAuthChallengeFailure(challenge.id);
    const attemptsLeft = maxChallengeAttempts - challenge.attempts - 1;
    if (attemptsLeft <= 0) {
      deleteAuthChallenge(challenge.id);
      jar.delete(challengeCookieName);
      return { status: "expired" };
    }
    return { status: "invalid", attemptsLeft };
  }

  deleteAuthChallenge(challenge.id);
  jar.delete(challengeCookieName);
  for (const { key } of keys) clearThrottle(key);
  await startSession(user.id);
  return { status: "ok", usedRecoveryCode: check.method === "recovery", recoveryCodesLeft: check.recoveryCodesLeft };
}

export async function cancelSecondFactor() {
  const jar = await cookies();
  const token = jar.get(challengeCookieName)?.value;
  if (isValidSessionToken(token)) {
    const challenge = getAuthChallenge(token);
    if (challenge) deleteAuthChallenge(challenge.id);
  }
  jar.delete(challengeCookieName);
}

// ─── Current user ───────────────────────────────────────────────────────────

export type AuthenticatedUser = AdminUser & {
  /** How this request was authenticated. */
  method: "session" | "proxy" | "none";
  /** Hashed id of the current session (session sign-ins only). */
  sessionId: string | null;
  /** The identity the reverse proxy passed through, when configured. */
  proxyUser: string | null;
};

const guest = (method: "none" | "proxy", proxyUser: string | null = null): AuthenticatedUser => ({
  id: 0, username: proxyUser ?? "guest", passwordHash: "", createdAt: "", method, sessionId: null, proxyUser
});

function proxyIdentity(config: AuthConfig, requestHeaders: HeaderLike) {
  if (config.mode !== "proxy" || !config.proxy) return null;
  const presented = requestHeaders.get(config.proxy.secretHeader);
  if (!presented) return null;
  const a = crypto.createHash("sha256").update(presented).digest();
  const b = crypto.createHash("sha256").update(config.proxy.secret).digest();
  if (!crypto.timingSafeEqual(a, b)) return null;
  if (!config.proxy.userHeader) return { proxyUser: null };
  const proxyUser = requestHeaders.get(config.proxy.userHeader)?.trim();
  return proxyUser ? { proxyUser } : null;
}

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const config = getAuthConfig();
  if (config.mode === "none") return guest("none");

  if (config.mode === "proxy") {
    const identity = proxyIdentity(config, await headers());
    if (identity) {
      const admin = getFirstAdmin();
      return admin
        ? { ...admin, method: "proxy", sessionId: null, proxyUser: identity.proxyUser }
        : guest("proxy", identity.proxyUser);
    }
  }

  const jar = await cookies();
  const session = readSession(jar.get(cookieName)?.value);
  if (!session) return null;
  const user = getAdminById(session.adminUserId);
  if (!user) return null;
  touchAuthSession(session.id);
  return { ...user, method: "session", sessionId: session.id, proxyUser: null };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    if (!hasAdminUser()) redirect("/setup");
    redirect("/login");
  }
  return user;
}

/** For pages that offer sign-out: only cookie sessions can be signed out of. */
export function canSignOut(user: AuthenticatedUser) {
  return user.method === "session";
}

// ─── Account changes ────────────────────────────────────────────────────────

export async function changeUsername(userId: number, username: string) {
  changeUsernameForAdmin(userId, username);
}

/** Changing the password signs out every other session. Returns "ok", "invalid" or "throttled". */
export async function changePassword(userId: number, currentPassword: string, nextPassword: string, keepSessionId: string | null = null) {
  const result = await changePasswordForAdmin(userId, currentPassword, nextPassword);
  if (result === "ok") revokeOtherAuthSessions(userId, keepSessionId);
  return result;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (isValidSessionToken(token)) revokeAuthSession(token);
  jar.delete(cookieName);
}
