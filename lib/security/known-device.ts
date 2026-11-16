import crypto from "node:crypto";
import { getAppSetting, setAppSetting } from "../db";

/**
 * "Known device" cookies: a signed note, set after a successful sign-in, that this browser has
 * signed in to this account before. Devices that carry one get their own failed-attempt counter
 * and skip the account-wide lock, so a stranger hammering the login form can lock out guessers,
 * but not the owner's own phone and laptop.
 *
 * Format: <userId>.<issuedAt seconds>.<random id>.<HMAC-SHA256 of the first three, base64url>
 */

export const knownDeviceCookieName = "carvey_device";
export const knownDeviceMaxAgeSeconds = 60 * 60 * 24 * 365;
const secretSetting = "auth.deviceSecret";

function deviceSecret() {
  let secret = getAppSetting(secretSetting);
  if (!secret) {
    secret = crypto.randomBytes(32).toString("hex");
    setAppSetting(secretSetting, secret);
  }
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", deviceSecret()).update(payload).digest("base64url");
}

export function issueKnownDeviceToken(userId: number, now = Date.now()) {
  const payload = `${userId}.${Math.floor(now / 1000)}.${crypto.randomBytes(12).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

/** The device's random id when the cookie is genuine, unexpired and for this user; otherwise null. */
export function verifyKnownDeviceToken(token: string | undefined, userId: number, now = Date.now()) {
  if (!token || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [user, issuedAt, id, signature] = parts;
  const expected = Buffer.from(sign(`${user}.${issuedAt}.${id}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (Number(user) !== userId || !/^[a-f0-9]{24}$/.test(id)) return null;
  const ageSeconds = now / 1000 - Number(issuedAt);
  if (!(ageSeconds >= 0 && ageSeconds <= knownDeviceMaxAgeSeconds)) return null;
  return id;
}
