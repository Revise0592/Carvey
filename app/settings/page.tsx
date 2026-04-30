import { KeyRound, UserRound } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { ThemeControls } from "@/components/ThemeControls";
import { updatePasswordAction, updateUsernameAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1>Settings</h1>
        </div>
      </section>

      <section className="settings-grid">
        <article className="settings-panel">
          <h2>Appearance</h2>
          <p className="muted">Choose how Carvey looks on this device.</p>
          <ThemeControls />
        </article>

        <article className="settings-panel">
          <h2><UserRound size={19} /> Account</h2>
          {params.account === "username-updated" ? <p className="success">Username updated.</p> : null}
          <form action={updateUsernameAction} className="record-form">
            <label>
              Username
              <input name="username" defaultValue={user.username} required minLength={2} />
            </label>
            <button className="primary-button" type="submit">Save username</button>
          </form>
        </article>

        <article className="settings-panel">
          <h2><KeyRound size={19} /> Password</h2>
          {params.account === "password-updated" ? <p className="success">Password updated.</p> : null}
          {params.account === "password-error" ? <p className="error">Current password did not match.</p> : null}
          <form action={updatePasswordAction} className="record-form">
            <label>
              Current password
              <input name="currentPassword" type="password" autoComplete="current-password" required />
            </label>
            <label>
              New password
              <input name="nextPassword" type="password" autoComplete="new-password" required minLength={8} />
            </label>
            <button className="primary-button" type="submit">Change password</button>
          </form>
        </article>

        <article className="settings-panel">
          <h2>App</h2>
          <dl className="metric-list">
            <span>Data directory</span>
            <strong>{process.env.CARVEY_DATA_DIR ?? "./data"}</strong>
            <span>Region defaults</span>
            <strong>UK, miles, GBP</strong>
            <span>Version</span>
            <strong>0.1.0</strong>
          </dl>
        </article>
      </section>
    </AppFrame>
  );
}
