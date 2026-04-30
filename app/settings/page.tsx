import { Download, KeyRound, RotateCcw, Upload, UserRound } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { ThemeControls } from "@/components/ThemeControls";
import { updatePasswordAction, updateUsernameAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { readRestoreSummary } from "@/lib/backup";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ account?: string; restore?: string; token?: string; message?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const restoreSummary = await readRestoreSummary(params.token);

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

        <article className="settings-panel">
          <h2><Download size={19} /> Backup</h2>
          <p className="muted">Download a complete backup of the database and vehicle images.</p>
          <a className="primary-button" href="/settings/backup">Download backup</a>
        </article>

        <article className="settings-panel">
          <h2><Upload size={19} /> Restore</h2>
          <p className="muted">Upload a Carvey backup to preview it before replacing current data.</p>
          {params.restore === "preview-error" || params.restore === "restore-error" ? <p className="error">{params.message ?? "Restore failed."}</p> : null}
          {params.restore === "success" ? <p className="success">Restore complete.</p> : null}
          {params.restore === "confirm-required" ? <p className="error">Confirm the restore before continuing.</p> : null}
          <form action="/settings/restore/preview" method="post" encType="multipart/form-data" className="record-form">
            <label>
              Backup file
              <input name="backup" type="file" accept=".zip,application/zip" required />
            </label>
            <button className="secondary-button" type="submit">Preview restore</button>
          </form>
        </article>

        {restoreSummary ? (
          <article className="settings-panel restore-preview">
            <h2><RotateCcw size={19} /> Restore preview</h2>
            <p className="muted">This backup will replace all current Carvey data if confirmed.</p>
            <dl className="metric-list">
              <span>Created</span>
              <strong>{formatDate(restoreSummary.createdAt.slice(0, 10))}</strong>
              <span>Vehicles</span>
              <strong>{restoreSummary.counts.vehicles}</strong>
              <span>Maintenance</span>
              <strong>{restoreSummary.counts.maintenance}</strong>
              <span>Repairs</span>
              <strong>{restoreSummary.counts.repairs}</strong>
              <span>MOTs</span>
              <strong>{restoreSummary.counts.mots}</strong>
              <span>Reminders</span>
              <strong>{restoreSummary.counts.reminders}</strong>
              <span>Images/files</span>
              <strong>{restoreSummary.uploadCount}</strong>
            </dl>
            <form action="/settings/restore/confirm" method="post" className="delete-confirm">
              <input type="hidden" name="token" value={restoreSummary.token} />
              <label>
                <input type="checkbox" name="confirmed" required />
                Replace current data with this backup
              </label>
              <button className="danger-button" type="submit">Restore backup</button>
            </form>
          </article>
        ) : null}
      </section>
    </AppFrame>
  );
}
