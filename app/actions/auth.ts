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
import { credentialsSchema, str } from "./shared";

export async function setupAction(formData: FormData) {
  const parsed = credentialsSchema.parse({
    username: str(formData, "username"),
    password: str(formData, "password")
  });
  try {
    await createFirstAdmin(parsed.username, parsed.password);
  } catch {
    redirect("/login");
  }
  await login(parsed.username, parsed.password);
  redirect("/garage");
}

export async function loginAction(formData: FormData) {
  // Don't apply the sign-up rules here: an over-short password is just a wrong password.
  const username = str(formData, "username").slice(0, 100);
  const password = (formData.get("password") as string | null)?.slice(0, 256) ?? "";
  if (!username || !password) redirect("/login?error=1");
  const result = await login(username, password);
  if (result.status === "throttled") redirect(`/login?error=throttled&wait=${Math.ceil(result.retryAfterSeconds / 60)}`);
  if (result.status === "invalid") redirect("/login?error=1");
  if (result.status === "two-factor") redirect("/login/verify");
  redirect("/garage");
}

export async function verifySecondFactorAction(formData: FormData) {
  const result = await completeSecondFactor(str(formData, "code").slice(0, 32));
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
  await logout();
  redirect("/login");
}

// ─── Account (Settings → Admin) ─────────────────────────────────────────────

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
  if (!check.ok) redirect(adminUrl(check.reason === "code" ? "code-error" : "password-error"));
  await changeUsername(user.id, username);
  revalidatePath("/settings");
  redirect(adminUrl("username-updated"));
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireAccountUser();
  const currentPassword = z.string().min(1).parse(formData.get("currentPassword"));
  const nextPassword = z.string().min(8).max(256).parse(formData.get("nextPassword"));
  const ok = await changePassword(user.id, currentPassword, nextPassword, user.sessionId);
  if (!ok) redirect(adminUrl("password-error"));
  redirect(adminUrl("password-updated"));
}

export async function signOutOtherSessionsAction() {
  const user = await requireAccountUser();
  revokeOtherAuthSessions(user.id, user.sessionId);
  revalidatePath("/settings");
  redirect(adminUrl("sessions-revoked"));
}

export async function revokeSessionAction(sessionId: string) {
  const user = await requireAccountUser();
  if (sessionId === user.sessionId) redirect(adminUrl("cannot-revoke-current"));
  revokeAuthSessionById(sessionId, user.id);
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
    if (!check.ok) redirect(`/settings?tab=admin&app=${check.reason === "code" ? "auth-code-error" : "auth-password-error"}`);
  }
  setAppSetting("authDisabled", authDisabled ? "true" : "false");
  revalidatePath("/", "layout");
  redirect("/settings?tab=admin&app=auth-updated");
}

// ─── Two-factor setup (returns state to a client form) ──────────────────────

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

  const result = confirmTotpSetup(user.id, str(formData, "code"), user.sessionId);
  if (result.ok) {
    // No revalidatePath here: refreshing now would swap this form for the "on" view and lose the
    // recovery codes before they're saved. The client refreshes when the user presses Done.
    return { step: "codes", recoveryCodes: result.recoveryCodes, message: "Two-factor authentication is on. Other devices have been signed out." };
  }
  const pending = getAdminById(user.id)?.totpPendingSecret;
  if (result.reason === "no-setup" || !pending) return { step: "idle", error: "Setup expired. Start again." };
  return { step: "setup", ...totpSetupDetails(user.username, pending), error: "That code didn't match. Check your phone's clock and try the newest code." };
}

export async function regenerateRecoveryCodesAction(_previous: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireAccountUser();
  const result = regenerateRecoveryCodes(user.id, str(formData, "code"));
  if (!result.ok) return { step: "idle", error: "That code didn't match." };
  return { step: "codes", recoveryCodes: result.recoveryCodes, message: "New recovery codes created. The old ones no longer work." };
}

export async function disableTwoFactorAction(formData: FormData) {
  const user = await requireAccountUser();
  const result = await disableTwoFactor(user.id, (formData.get("currentPassword") as string | null) ?? "", str(formData, "code"), user.sessionId);
  if (!result.ok) redirect(adminUrl(result.reason === "code" ? "code-error" : "password-error"));
  revalidatePath("/settings");
  redirect(adminUrl("2fa-disabled"));
}
