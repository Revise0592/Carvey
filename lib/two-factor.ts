import bcrypt from "bcryptjs";
import qrcode from "qrcode-generator";
import {
  consumeRecoveryCode,
  disableTotp,
  enableTotp,
  getAdminById,
  recordTotpCounter,
  revokeOtherAuthSessions,
  setPendingTotpSecret,
  setRecoveryCodes,
  type AdminUser
} from "./db";
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, otpauthUri, verifyTotp } from "./security/totp";

export function isTwoFactorEnabled(user: Pick<AdminUser, "totpEnabledAt" | "totpSecret">) {
  return Boolean(user.totpEnabledAt && user.totpSecret);
}

export function recoveryCodesLeft(user: Pick<AdminUser, "recoveryCodes">) {
  return user.recoveryCodes ? (JSON.parse(user.recoveryCodes) as string[]).length : 0;
}

type CheckResult = { ok: true; method: "totp" | "recovery"; recoveryCodesLeft: number } | { ok: false };

/**
 * Accepts either a 6-digit authenticator code (each time step only once) or an unused recovery
 * code (each one only once).
 */
export function checkSecondFactor(user: AdminUser, input: string): CheckResult {
  if (!isTwoFactorEnabled(user)) return { ok: false };
  const code = input.trim();
  if (/^\d{3}\s?\d{3}$/.test(code)) {
    const counter = verifyTotp(user.totpSecret!, code, { lastUsedCounter: user.totpLastCounter ?? null });
    if (counter === null || !recordTotpCounter(user.id, counter)) return { ok: false };
    return { ok: true, method: "totp", recoveryCodesLeft: recoveryCodesLeft(user) };
  }
  if (code.replace(/[^a-z0-9]/gi, "").length === 10 && consumeRecoveryCode(user.id, hashRecoveryCode(code))) {
    return { ok: true, method: "recovery", recoveryCodesLeft: recoveryCodesLeft(getAdminById(user.id)!) };
  }
  return { ok: false };
}

/**
 * Confirms it's really the account owner before a sensitive change: the password, plus a second
 * factor when two-factor is on.
 */
export async function verifyReauthentication(userId: number, password: string, code: string | null) {
  const user = getAdminById(userId);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { ok: false as const, reason: "password" as const };
  if (isTwoFactorEnabled(user) && !checkSecondFactor(user, code ?? "").ok) return { ok: false as const, reason: "code" as const };
  return { ok: true as const };
}

export function qrSvg(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
}

/** Starts (or restarts) setup with a fresh secret that isn't active until confirmed. */
export function beginTotpSetup(user: AdminUser) {
  const secret = generateTotpSecret();
  setPendingTotpSecret(user.id, secret);
  return totpSetupDetails(user.username, secret);
}

export function totpSetupDetails(username: string, secret: string) {
  const uri = otpauthUri(secret, username);
  return { secret, uri, svg: qrSvg(uri) };
}

/** Turns two-factor on once the user proves their app works, and returns fresh recovery codes. */
export function confirmTotpSetup(userId: number, code: string, keepSessionId: string | null) {
  const user = getAdminById(userId);
  if (!user?.totpPendingSecret) return { ok: false as const, reason: "no-setup" as const };
  const counter = verifyTotp(user.totpPendingSecret, code);
  if (counter === null) return { ok: false as const, reason: "code" as const };
  const codes = generateRecoveryCodes();
  enableTotp(user.id, user.totpPendingSecret, counter, codes.map(hashRecoveryCode));
  revokeOtherAuthSessions(user.id, keepSessionId);
  return { ok: true as const, recoveryCodes: codes };
}

export function cancelTotpSetup(userId: number) {
  setPendingTotpSecret(userId, null);
}

export async function disableTwoFactor(userId: number, password: string, code: string, keepSessionId: string | null) {
  const check = await verifyReauthentication(userId, password, code);
  if (!check.ok) return check;
  disableTotp(userId);
  revokeOtherAuthSessions(userId, keepSessionId);
  return { ok: true as const };
}

export function regenerateRecoveryCodes(userId: number, code: string) {
  const user = getAdminById(userId);
  if (!user || !checkSecondFactor(user, code).ok) return { ok: false as const };
  const codes = generateRecoveryCodes();
  setRecoveryCodes(userId, codes.map(hashRecoveryCode));
  return { ok: true as const, recoveryCodes: codes };
}
