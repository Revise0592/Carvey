import { clearThrottle, getThrottle, saveThrottle } from "../db";

/**
 * Failed-attempt limits for anything that checks a secret: sign-in, two-factor codes, and the
 * password/code re-checks before sensitive account changes. Counters live in SQLite
 * (`auth_throttle`) so they survive restarts.
 */

export const throttleWindowMs = 15 * 60 * 1000;

export type ThrottleKey = { key: string; limit: number };

export type ThrottleOutcome =
  | { status: "ok" }
  | { status: "failed" }
  | { status: "throttled"; retryAfterSeconds: number };

/** Seconds until another attempt is allowed, or 0. */
export function throttleRetryAfter(keys: Array<{ key: string }>, now = Date.now()) {
  let wait = 0;
  for (const { key } of keys) {
    const state = getThrottle(key);
    if (state?.lockedUntil) wait = Math.max(wait, Math.ceil((Date.parse(state.lockedUntil) - now) / 1000));
  }
  return Math.max(0, wait);
}

export function recordThrottleFailure(keys: ThrottleKey[], now = Date.now()) {
  for (const { key, limit } of keys) {
    const state = getThrottle(key);
    const windowStart = state && now - Date.parse(state.windowStartedAt) < throttleWindowMs ? state.windowStartedAt : new Date(now).toISOString();
    const failures = (state && windowStart === state.windowStartedAt ? state.failures : 0) + 1;
    const lockedUntil = failures >= limit ? new Date(Date.parse(windowStart) + throttleWindowMs).toISOString() : null;
    saveThrottle(key, { failures, windowStartedAt: windowStart, lockedUntil });
  }
}

/** Gives back an attempt that was charged up front but turned out to be correct. */
export function refundThrottleAttempt(key: string) {
  const state = getThrottle(key);
  if (!state) return;
  if (state.failures <= 1) clearThrottle(key);
  else saveThrottle(key, { ...state, failures: state.failures - 1, lockedUntil: null });
}

export { clearThrottle };

/**
 * Runs one guarded attempt. The attempt is charged *before* `attempt` runs, in the same
 * synchronous step as the limit check, so parallel requests can't all slip under the limit while
 * an async bcrypt compare is in flight. A successful attempt gets its charge back.
 */
export async function withThrottle(keys: ThrottleKey[], attempt: () => boolean | Promise<boolean>): Promise<ThrottleOutcome> {
  const retryAfterSeconds = throttleRetryAfter(keys);
  if (retryAfterSeconds > 0) return { status: "throttled", retryAfterSeconds };
  recordThrottleFailure(keys);
  const ok = await attempt();
  if (!ok) return { status: "failed" };
  for (const { key } of keys) refundThrottleAttempt(key);
  return { status: "ok" };
}

/** Limits on re-checking the password or a code for an account change, per account. */
export function reauthKeys(userId: number): ThrottleKey[] {
  return [{ key: `reauth:${userId}`, limit: 5 }];
}
