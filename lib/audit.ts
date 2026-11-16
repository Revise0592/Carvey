import { headers } from "next/headers";
import { insertAuditEntry } from "./db";
import { clientAddress } from "./security/request";

export type AuditEvent =
  | "login.ok" | "login.failed" | "login.throttled"
  | "2fa.ok" | "2fa.failed" | "2fa.throttled" | "2fa.enabled" | "2fa.disabled" | "2fa.recovery-regenerated"
  | "logout" | "password.changed" | "username.changed" | "sessions.revoked" | "sign-in-mode.changed"
  | "reauth.failed" | "reauth.throttled"
  | "backup.downloaded" | "backup.restored" | "csv.imported" | "setup.completed";

export const auditEventLabels: Record<AuditEvent, string> = {
  "login.ok": "Signed in",
  "login.failed": "Failed sign-in",
  "login.throttled": "Sign-in blocked (too many attempts)",
  "2fa.ok": "Two-factor code accepted",
  "2fa.failed": "Wrong two-factor code",
  "2fa.throttled": "Two-factor blocked (too many attempts)",
  "2fa.enabled": "Two-factor turned on",
  "2fa.disabled": "Two-factor turned off",
  "2fa.recovery-regenerated": "New recovery codes created",
  logout: "Signed out",
  "password.changed": "Password changed",
  "username.changed": "Username changed",
  "sessions.revoked": "Other devices signed out",
  "sign-in-mode.changed": "Sign-in setting changed",
  "reauth.failed": "Wrong password or code for an account change",
  "reauth.throttled": "Account change blocked (too many attempts)",
  "backup.downloaded": "Backup downloaded",
  "backup.restored": "Backup restored",
  "csv.imported": "CSV imported",
  "setup.completed": "Admin account created"
};

/**
 * Records an event with the client's address and browser, when called during a request. Never
 * throws: a failure to log must not break the action being logged.
 */
export async function audit(event: AuditEvent, detail: string | null = null) {
  try {
    let client: string | null = null;
    let userAgent: string | null = null;
    try {
      const requestHeaders = await headers();
      client = clientAddress(requestHeaders);
      userAgent = requestHeaders.get("user-agent");
    } catch {
      // Outside a request (scheduler, tests): no client details.
    }
    insertAuditEntry({ event, detail, client, userAgent });
  } catch (error) {
    console.error("[Carvey] Could not write audit log entry:", error);
  }
}
