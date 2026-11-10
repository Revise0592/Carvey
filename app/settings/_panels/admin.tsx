import { KeyRound, LaptopMinimal, LogOut, ShieldCheck, ShieldAlert, UserRound } from "lucide-react";
import {
  disableTwoFactorAction,
  revokeSessionAction,
  signOutOtherSessionsAction,
  updateAuthSettingsAction,
  updatePasswordAction,
  updateUsernameAction
} from "@/app/actions";
import { RegenerateRecoveryCodes, TwoFactorSetup } from "@/components/TwoFactorSetup";
import { getAuthConfig, type AuthenticatedUser } from "@/lib/auth";
import { getAdminById, listActiveAuthSessions } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { describeUserAgent } from "@/lib/security/request";
import { isTwoFactorEnabled, recoveryCodesLeft } from "@/lib/two-factor";

const accountMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  "username-updated": { tone: "success", text: "Username updated." },
  "password-updated": { tone: "success", text: "Password updated. Other devices have been signed out." },
  "password-error": { tone: "error", text: "Your current password didn't match." },
  "code-error": { tone: "error", text: "That two-factor code didn't match." },
  "2fa-disabled": { tone: "success", text: "Two-factor authentication is off. Other devices have been signed out." },
  "sessions-revoked": { tone: "success", text: "Signed out of every other device." },
  "session-revoked": { tone: "success", text: "That device has been signed out." },
  "cannot-revoke-current": { tone: "error", text: "Use Sign out to end this session." },
  "auth-disabled": { tone: "error", text: "Account settings aren't available while sign-in is turned off." }
};

const appMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  "auth-updated": { tone: "success", text: "Sign-in setting saved." },
  "auth-confirm-required": { tone: "error", text: "Tick the confirmation box before turning sign-in off." },
  "auth-password-error": { tone: "error", text: "Your current password didn't match, so sign-in is still on." },
  "auth-code-error": { tone: "error", text: "That two-factor code didn't match, so sign-in is still on." },
  "auth-env-managed": { tone: "error", text: "Sign-in is set by CARVEY_AUTH_MODE, so it can't be changed here." }
};

function Feedback({ message }: { message?: { tone: "success" | "error"; text: string } }) {
  return message ? <p className={message.tone}>{message.text}</p> : null;
}

function ReauthFields({ twoFactor }: { twoFactor: boolean }) {
  return (
    <>
      <label>
        Current password
        <input name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      {twoFactor ? (
        <label>
          Two-factor code
          <input name="code" autoComplete="one-time-code" required maxLength={32} />
        </label>
      ) : null}
    </>
  );
}

const modeDescriptions = {
  password: "Username and password, plus a two-factor code when it's turned on.",
  proxy: "Your reverse proxy signs people in and vouches for them with a shared secret. Anyone reaching Carvey without that secret, for example on the container port directly, still has to sign in with a password.",
  none: "Sign-in is off. Anyone who can reach this address has full access."
};

export function AdminPanel({ user, account, app, recoveryLeft }: { user: AuthenticatedUser; account?: string; app?: string; recoveryLeft?: string }) {
  const config = getAuthConfig();
  const admin = user.id ? getAdminById(user.id) : undefined;
  const twoFactor = admin ? isTwoFactorEnabled(admin) : false;
  const sessions = admin ? listActiveAuthSessions(admin.id) : [];
  const accountMessage = accountMessages[account ?? ""];

  return (
    <section className="settings-grid">
      {accountMessage && admin ? (
        <article className="settings-panel settings-panel-col2-span2">
          <Feedback message={accountMessage} />
        </article>
      ) : null}
      {account === "recovery-used" ? (
        <article className="settings-panel settings-panel-col2-span2">
          <p className="error">
            You signed in with a recovery code. {recoveryLeft === "0" ? "That was your last one: " : `${recoveryLeft ?? "Some"} left. `}
            Create new recovery codes below, or reset two-factor if you&apos;ve lost your authenticator.
          </p>
        </article>
      ) : null}

      {admin ? (
        <>
          <article className="settings-panel">
            <h2><UserRound size={19} /> Account</h2>
            <form action={updateUsernameAction} className="record-form">
              <label>
                Username
                <input name="username" defaultValue={admin.username} required minLength={2} maxLength={48} />
              </label>
              <ReauthFields twoFactor={twoFactor} />
              <button className="primary-button" type="submit">Save username</button>
            </form>
          </article>

          <article className="settings-panel">
            <h2><KeyRound size={19} /> Password</h2>
            <form action={updatePasswordAction} className="record-form">
              <label>
                Current password
                <input name="currentPassword" type="password" autoComplete="current-password" required />
              </label>
              <label>
                New password
                <input name="nextPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256} />
              </label>
              <button className="primary-button" type="submit">Change password</button>
            </form>
            <p className="field-hint">Changing your password signs out every other device.</p>
          </article>

          <article className="settings-panel">
            <h2><ShieldCheck size={19} /> Two-factor authentication</h2>
            {twoFactor ? (
              <>
                <p className="success">On since {formatDate(admin.totpEnabledAt!.slice(0, 10))}. {recoveryCodesLeft(admin)} recovery codes left.</p>
                <details>
                  <summary className="secondary-button">New recovery codes</summary>
                  <RegenerateRecoveryCodes />
                </details>
                <details>
                  <summary className="danger-button">Turn off two-factor</summary>
                  <form action={disableTwoFactorAction} className="record-form">
                    <ReauthFields twoFactor />
                    <button className="danger-button" type="submit">Turn off two-factor</button>
                  </form>
                </details>
              </>
            ) : (
              <>
                <p className="muted">Ask for a code from an authenticator app when signing in, so a leaked password isn&apos;t enough on its own.</p>
                <TwoFactorSetup />
              </>
            )}
            {config.mode === "proxy" ? <p className="field-hint">In proxy mode this only applies to password sign-ins, such as direct access that bypasses the proxy.</p> : null}
          </article>

          <article className="settings-panel">
            <h2><LaptopMinimal size={19} /> Signed-in devices</h2>
            {sessions.length ? (
              <ul className="session-list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <span>
                      <strong>{describeUserAgent(session.userAgent ?? null)}</strong>
                      <small>
                        {session.id === user.sessionId ? "This device · " : ""}
                        Signed in {formatDate(session.createdAt.slice(0, 10))}
                        {session.lastSeenAt ? ` · active ${formatDate(session.lastSeenAt.slice(0, 10))}` : ""}
                      </small>
                    </span>
                    {session.id !== user.sessionId ? (
                      <form action={revokeSessionAction.bind(null, session.id)}>
                        <button className="icon-button" type="submit" aria-label="Sign out this device" title="Sign out this device"><LogOut size={16} /></button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No password sign-ins are active.</p>}
            {sessions.some((session) => session.id !== user.sessionId) ? (
              <form action={signOutOtherSessionsAction}>
                <button className="secondary-button" type="submit">Sign out of all other devices</button>
              </form>
            ) : null}
          </article>
        </>
      ) : (
        <article className="settings-panel">
          <Feedback message={accountMessage} />
          <p className="muted">Account settings appear here once sign-in is turned on.</p>
        </article>
      )}

      <article className="settings-panel settings-panel-col2-span2">
        <h2>{config.mode === "none" ? <ShieldAlert size={19} /> : <ShieldCheck size={19} />} Sign-in mode</h2>
        <Feedback message={appMessages[app ?? ""]} />
        {config.problem ? <p className="error">{config.problem}</p> : null}
        <dl className="metric-list">
          <span>Mode</span>
          <strong>{config.mode === "password" ? "Password" : config.mode === "proxy" ? "Reverse proxy" : "Off"}</strong>
          <span>Set by</span>
          <strong>{config.source === "env" ? "CARVEY_AUTH_MODE" : config.source === "settings" ? "This page" : "Default"}</strong>
          {user.method === "proxy" ? (
            <>
              <span>Signed in via proxy as</span>
              <strong>{user.proxyUser ?? "(no user header configured)"}</strong>
            </>
          ) : null}
        </dl>
        <p className="muted">{modeDescriptions[config.mode]}</p>
        {config.mode === "none" ? <p className="error">Warning: anyone who can reach this address has full access. Proxy mode (see the README) protects Carvey behind a proxy without leaving the port open.</p> : null}

        {config.source !== "env" ? (
          config.mode === "none" ? (
            <form action={updateAuthSettingsAction} className="record-form">
              <input type="hidden" name="authDisabled" value="" />
              <button className="primary-button" type="submit">Turn sign-in back on</button>
            </form>
          ) : (
            <details className="danger-zone">
              <summary>Turn sign-in off…</summary>
              <form action={updateAuthSettingsAction} className="record-form">
                <p className="muted">
                  To put Carvey behind a reverse proxy that handles sign-in, set <code>CARVEY_AUTH_MODE=proxy</code> and a <code>CARVEY_PROXY_SECRET</code> instead. Turning sign-in off leaves anyone who can reach the port with full access.
                </p>
                <input type="hidden" name="authDisabled" value="on" />
                <label className="checkbox-field">
                  <input name="confirmed" type="checkbox" required />
                  I understand this removes all login protection
                </label>
                {admin ? <ReauthFields twoFactor={twoFactor} /> : null}
                <button className="danger-button" type="submit">Turn sign-in off</button>
              </form>
            </details>
          )
        ) : null}
      </article>
    </section>
  );
}
