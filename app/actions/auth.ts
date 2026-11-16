"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelSecondFactor,
  changePassword,
  changeUsername,
  completeSecondFactor,
  createFirstAdmin,
  getAuthConfig,
  login,
  logout,
  requireUser
} from "@/lib/auth";
import { getAdminById, revokeAuthSessionById, revokeOtherAuthSessions, setAppSetting } from "@/lib/db";
import {
  beginTotpSetup,
  cancelTotpSetup,
  confirmTotpSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  totpSetupDetails,
  verifyReauthentication
} from "@/lib/two-factor";
import { audit } from "@/lib/audit";
import { credentialsSchema, str } from "./shared";

export async function setupAction(formData: FormData) {
  const result = credentialsSchema.safeParse({
    username: str(formData, "username"),
    password: str(formData, "password")
  });
  // The form enforces these lengths too; this covers browsers or scripts that skip it, which
  // used to get a server error page instead of a message.
  if (!result.success) redirect("/setup?error=invalid");
  const parsed = result.data;
  try {
    await createFirstAdmin(parsed.username, parsed.password);
  } catch {
    redirect("/login");
  }
  await audit("setup.completed", parsed.username);
  await login(parsed.username, parsed.password);
  redirect("/garage");
}

export async function loginAction(formData: FormData) {
  // Don't apply the sign-up rules here: an over-short password is just a wrong password.
  const username = str(formData, "username").slice(0, 100);
  const password = (formData.get("password") as string | null)?.slice(0, 256) ?? "";
  if (!username || !password) redirect("/login?error=1");
  const result = await login(username, password);
  await audit(result.status === "throttled" ? "login.throttled" : result.status === "invalid" ? "login.failed" : "login.ok", result.status === "two-factor" ? `${username} (password ok, waiting for code)` : username);
  if (result.status === "throttled") redirect(`/login?error=throttled&wait=${Math.ceil(result.retryAfterSeconds / 60)}`);
  if (result.status === "invalid") redirect("/login?error=1");
  if (result.status === "two-factor") redirect("/login/verify");
  redirect("/garage");
}

export async function verifySecondFactorAction(formData: FormData) {
  const result = await completeSecondFactor(str(formData, "code").slice(0, 32));
  if (result.status !== "expired") await audit(result.status === "ok" ? "2fa.ok" : result.status === "throttled" ? "2fa.throttled" : "2fa.failed", result.status === "ok" && result.usedRecoveryCode ? "recovery code used" : null);
  if (result.status === "expired") redirect("/login?error=expired");
  if (result.status === "throttled") redirect(`/login?error=throttled&wait=${Math.ceil(result.retryAfterSeconds / 60)}`);
  if (result.status === "invalid") redirect(`/login/verify?error=1&left=${result.attemptsLeft}`);
  redirect(result.usedRecoveryCode ? `/settings?tab=admin&account=recovery-used&left=${result.recoveryCodesLeft}` : "/garage");
}

export async function cancelSecondFactorAction() {
  await cancelSecondFactor();
  redirect("/login");
}

export async function logoutAction() {
  await audit("logout");
  await logout();
  redirect("/login");
}

// ─── Account (Settings → Admin) ─────────────────────────────────────────────

/** Settings → Admin message key for a failed password/code re-check. */
function reauthError(reason: "password" | "code" | "throttled", prefix = "") {
  return `${prefix}${reason === "code" ? "code-error" : reason === "throttled" ? "reauth-throttled" : "password-error"}`;
}

function adminUrl(account: string) {
  return `/settings?tab=admin&account=${account}`;
}

async function requireAccountUser() {
  const user = await requireUser();
  if (user.id === 0) redirect(adminUrl("auth-disabled"));
  return user;
}

export async function updateUsernameAction(formData: FormData) {
  const user = await requireAccountUser();
  const username = z.string().min(2).max(48).parse(str(formData, "username"));
  const check = await verifyReauthentication(user.id, (formData.get("currentPassword") as string | null) ?? "", str(formData, "code") || null);
  if (!check.ok) {
    await audit(check.reason === "throttled" ? "reauth.throttled" : "reauth.failed", "change username");
    redirect(adminUrl(reauthError(check.reason)));
  }
  await changeUsername(user.id, username);
  await audit("username.changed", `${user.username} → ${username}`);
  revalidatePath("/settings");
  redirect(adminUrl("username-updated"));
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireAccountUser();
  const currentPassword = z.string().min(1).parse(formData.get("currentPassword"));
  const nextPassword = z.string().min(8).max(256).parse(formData.get("nextPassword"));
  const result = await changePassword(user.id, currentPassword, nextPassword, user.sessionId);
  if (result !== "ok") {
    await audit(result === "throttled" ? "reauth.throttled" : "reauth.failed", "change password");
    redirect(adminUrl(result === "throttled" ? "reauth-throttled" : "password-error"));
  }
  await audit("password.changed");
  redirect(adminUrl("password-updated"));
}

export async function signOutOtherSessionsAction() {
  const user = await requireAccountUser();
  revokeOtherAuthSessions(user.id, user.sessionId);
  await audit("sessions.revoked", "all other devices");
  revalidatePath("/settings");
  redirect(adminUrl("sessions-revoked"));
}

export async function revokeSessionAction(sessionId: string) {
  const user = await requireAccountUser();
  if (sessionId === user.sessionId) redirect(adminUrl("cannot-revoke-current"));
  revokeAuthSessionById(sessionId, user.id);
  await audit("sessions.revoked", "one device");
  revalidatePath("/settings");
  redirect(adminUrl("session-revoked"));
}

/**
 * The legacy "disable authentication" toggle. Turning sign-in off now needs the password (and a
 * 2FA code), and it can't override CARVEY_AUTH_MODE.
 */
export async function updateAuthSettingsAction(formData: FormData) {
  const user = await requireUser();
  if (getAuthConfig().source === "env") redirect("/settings?tab=admin&app=auth-env-managed");
  const authDisabled = str(formData, "authDisabled") === "on";
  if (authDisabled) {
    if (str(formData, "confirmed") !== "on") redirect("/settings?tab=admin&app=auth-confirm-required");
    if (user.id === 0) redirect("/settings?tab=admin&app=auth-updated");
    const check = await verifyReauthentication(user.id, (formData.get("currentPassword") as string | null) ?? "", str(formData, "code") || null);
    if (!check.ok) {
      await audit(check.reason === "throttled" ? "reauth.throttled" : "reauth.failed", "turn sign-in off");
      redirect(`/settings?tab=admin&app=${reauthError(check.reason, "auth-")}`);
    }
  }
  setAppSetting("authDisabled", authDisabled ? "true" : "false");
  await audit("sign-in-mode.changed", authDisabled ? "sign-in turned off" : "sign-in turned on");
  revalidatePath("/", "layout");
  redirect("/settings?tab=admin&app=auth-updated");
}

// ─── Two-factor setup (returns state to a client form) ──────────────────────

const throttledMessage = "Too many wrong attempts. Wait 15 minutes and try again.";

export type TwoFactorState =
  | { step: "idle"; message?: string; error?: string }
  | { step: "setup"; secret: string; svg: string; uri: string; error?: string }
  | { step: "codes"; recoveryCodes: string[]; message: string };

/** One action for the whole enrolment flow, so the client form keeps a single piece of state. */
export async function twoFactorSetupAction(_previous: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireAccountUser();
  const intent = str(formData, "intent");

  if (intent === "start") {
    const { secret, svg, uri } = beginTotpSetup(user);
    return { step: "setup", secret, svg, uri };
  }
  if (intent === "cancel") {
    cancelTotpSetup(user.id);
    return { step: "idle" };
  }

  const result = await confirmTotpSetup(user.id, str(formData, "code"), user.sessionId);
  if (result.ok) {
    await audit("2fa.enabled");
    // No revalidatePath here: refreshing now would swap this form for the "on" view and lose the
    // recovery codes before they're saved. The client refreshes when the user presses Done.
    return { step: "codes", recoveryCodes: result.recoveryCodes, message: "Two-factor authentication is on. Other devices have been signed out." };
  }
  const pending = getAdminById(user.id)?.totpPendingSecret;
  if (result.reason === "no-setup" || !pending) return { step: "idle", error: "Setup expired. Start again." };
  if (result.reason === "throttled") return { step: "setup", ...totpSetupDetails(user.username, pending), error: throttledMessage };
  return { step: "setup", ...totpSetupDetails(user.username, pending), error: "That code didn't match. Check your phone's clock and try the newest code." };
}

export async function regenerateRecoveryCodesAction(_previous: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireAccountUser();
  const result = await regenerateRecoveryCodes(user.id, str(formData, "code"));
  if (!result.ok) return { step: "idle", error: result.reason === "throttled" ? throttledMessage : "That code didn't match." };
  await audit("2fa.recovery-regenerated");
  return { step: "codes", recoveryCodes: result.recoveryCodes, message: "New recovery codes created. The old ones no longer work." };
}

export async function disableTwoFactorAction(formData: FormData) {
  const user = await requireAccountUser();
  const result = await disableTwoFactor(user.id, (formData.get("currentPassword") as string | null) ?? "", str(formData, "code"), user.sessionId);
  if (!result.ok) {
    await audit(result.reason === "throttled" ? "reauth.throttled" : "reauth.failed", "turn off two-factor");
    redirect(adminUrl(reauthError(result.reason)));
  }
  await audit("2fa.disabled");
  revalidatePath("/settings");
  redirect(adminUrl("2fa-disabled"));
}
