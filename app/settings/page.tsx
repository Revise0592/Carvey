import Link from "next/link";
import { Building2, Download, KeyRound, RotateCcw, Settings2, Trash2, Upload, UserRound } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { ThemeControls } from "@/components/ThemeControls";
import { createWorkshopAction, deleteWorkshopAction, updateCollectionNameAction, updatePasswordAction, updateUsernameAction, updateWorkshopAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { readRestoreSummary } from "@/lib/backup";
import { getCollectionName, listWorkshops, type Workshop } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const settingsTabs = ["personalisation", "admin", "workshops", "backup"] as const;
type SettingsTab = (typeof settingsTabs)[number];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; account?: string; app?: string; workshop?: string; restore?: string; token?: string; message?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const activeTab = settingsTabs.includes(params.tab as SettingsTab) ? (params.tab as SettingsTab) : "personalisation";
  const restoreSummary = await readRestoreSummary(params.token);
  const collectionName = getCollectionName();
  const workshops = listWorkshops();

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1>Settings</h1>
        </div>
      </section>

      <nav className="tabs settings-tabs" aria-label="Settings sections">
        <Link className={activeTab === "personalisation" ? "active" : ""} href="/settings?tab=personalisation">Personalisation</Link>
        <Link className={activeTab === "admin" ? "active" : ""} href="/settings?tab=admin">Admin</Link>
        <Link className={activeTab === "workshops" ? "active" : ""} href="/settings?tab=workshops">Garages & workshops</Link>
        <Link className={activeTab === "backup" ? "active" : ""} href="/settings?tab=backup">Backup & restore</Link>
      </nav>

      {activeTab === "personalisation" ? (
        <section className="settings-grid">
          <article className="settings-panel">
            <h2>Appearance</h2>
            <p className="muted">Choose how Carvey looks on this device.</p>
            <ThemeControls />
          </article>

          <article className="settings-panel">
            <h2><Settings2 size={19} /> Personalisation</h2>
            <p className="muted">Name this collection so Carvey feels like yours.</p>
            {params.app === "collection-updated" ? <p className="success">Collection name updated.</p> : null}
            <form action={updateCollectionNameAction} className="record-form">
              <label>
                Collection name
                <input name="collectionName" defaultValue={collectionName} required minLength={1} maxLength={40} />
              </label>
              <button className="primary-button" type="submit">Save name</button>
            </form>
          </article>
        </section>
      ) : null}

      {activeTab === "admin" ? (
        <section className="settings-grid">
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
        </section>
      ) : null}

      {activeTab === "workshops" ? (
        <section className="settings-grid">
          <article className="settings-panel">
            <h2><Building2 size={19} /> Add garage/workshop</h2>
            {params.workshop === "created" ? <p className="success">Garage/workshop saved.</p> : null}
            {params.workshop === "updated" ? <p className="success">Garage/workshop updated.</p> : null}
            {params.workshop === "deleted" ? <p className="success">Garage/workshop deleted.</p> : null}
            <WorkshopForm action={createWorkshopAction} button="Save garage/workshop" />
          </article>

          <article className="settings-panel workshop-list-panel">
            <h2>Saved garages & workshops</h2>
            {workshops.length ? (
              <div className="workshop-list">
                {workshops.map((workshop) => (
                  <WorkshopCard workshop={workshop} key={workshop.id} />
                ))}
              </div>
            ) : <p className="muted">No saved garages or workshops yet.</p>}
          </article>
        </section>
      ) : null}

      {activeTab === "backup" ? (
        <section className="settings-grid">
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
      ) : null}
    </AppFrame>
  );
}

function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const updateAction = updateWorkshopAction.bind(null, workshop.id);
  const deleteAction = deleteWorkshopAction.bind(null, workshop.id);
  return (
    <article className="workshop-card">
      <div>
        <h3>{workshop.name}</h3>
        {workshop.preferred ? <span className="tag pass">Preferred</span> : null}
      </div>
      {workshop.address ? <p>{workshop.address}</p> : null}
      {[workshop.phone, workshop.email, workshop.website].filter(Boolean).length ? (
        <p className="muted">{[workshop.phone, workshop.email, workshop.website].filter(Boolean).join(" · ")}</p>
      ) : null}
      {workshop.notes ? <p>{workshop.notes}</p> : null}
      <details>
        <summary className="secondary-button">Edit</summary>
        <WorkshopForm workshop={workshop} action={updateAction} button="Save changes" />
      </details>
      <form action={deleteAction} className="delete-confirm">
        <label>
          <input type="checkbox" name="confirmed" required />
          Confirm delete
        </label>
        <button className="danger-button" type="submit"><Trash2 size={17} /> Delete</button>
      </form>
    </article>
  );
}

function WorkshopForm({ workshop, action, button }: { workshop?: Workshop; action: (formData: FormData) => void | Promise<void>; button: string }) {
  return (
    <form action={action} className="record-form">
      <label>
        Name
        <input name="name" defaultValue={workshop?.name ?? ""} required maxLength={100} />
      </label>
      <label>
        Address
        <textarea name="address" defaultValue={workshop?.address ?? ""} />
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={workshop?.phone ?? ""} />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={workshop?.email ?? ""} />
      </label>
      <label>
        Website
        <input name="website" type="url" defaultValue={workshop?.website ?? ""} />
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={workshop?.notes ?? ""} />
      </label>
      <label className="checkbox-field">
        <input name="preferred" type="checkbox" defaultChecked={Boolean(workshop?.preferred)} />
        Preferred garage/workshop
      </label>
      <button className="primary-button" type="submit">{button}</button>
    </form>
  );
}
