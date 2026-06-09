import Link from "next/link";
import { Building2, Download, Globe, KeyRound, RotateCcw, Settings2, Trash2, Upload, UserRound } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { ThemeControls } from "@/components/ThemeControls";
import { createMaintenanceCategoryAction, createWorkshopAction, deleteMaintenanceCategoryAction, deleteWorkshopAction, loadShowcaseDemoDataAction, restorePreviousDemoDataAction, saveCurrentShowcaseDemoDataAction, updateAuthSettingsAction, updateCollectionNameAction, updateMaintenanceCategoryAction, updatePasswordAction, updateRegionalSettingsAction, updateUsernameAction, updateWorkshopAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getShowcaseDemoStatus, readRestoreSummary } from "@/lib/backup";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { getCollectionName, listMaintenanceCategories, listWorkshops, type MaintenanceCategory, type Workshop } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getRegionalSettings } from "@/lib/regional-settings";

export const dynamic = "force-dynamic";

const settingsTabs = ["personalisation", "admin", "regional", "workshops", "categories", "backup"] as const;
type SettingsTab = (typeof settingsTabs)[number];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; account?: string; app?: string; workshop?: string; category?: string; restore?: string; token?: string; debug?: string; message?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const activeTab = settingsTabs.includes(params.tab as SettingsTab) ? (params.tab as SettingsTab) : "personalisation";
  const restoreSummary = await readRestoreSummary(params.token);
  const debugEnabled = debugEasterEggsEnabled();
  const debugDemoStatus = debugEnabled ? await getShowcaseDemoStatus() : null;
  const collectionName = getCollectionName();
  const workshops = listWorkshops();
  const categories = listMaintenanceCategories();
  const regionalSettings = getRegionalSettings();

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
        <Link className={activeTab === "regional" ? "active" : ""} href="/settings?tab=regional"><Globe size={15} /> Regional</Link>
        <Link className={activeTab === "workshops" ? "active" : ""} href="/settings?tab=workshops">Garages & Workshops</Link>
        <Link className={activeTab === "categories" ? "active" : ""} href="/settings?tab=categories">Maintenance Categories</Link>
        <Link className={activeTab === "backup" ? "active" : ""} href="/settings?tab=backup">Backup & Restore</Link>
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
          {regionalSettings.authDisabled ? (
            <article className="settings-panel">
              <p className="error">Authentication is disabled. Account settings are unavailable. Enable authentication in the Regional tab to manage your account.</p>
            </article>
          ) : null}
          {!regionalSettings.authDisabled ? (
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
          ) : null}

          {!regionalSettings.authDisabled ? (
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
          ) : null}
        </section>
      ) : null}

      {activeTab === "regional" ? (
        <section className="settings-grid">
          <article className="settings-panel">
            <h2><Globe size={19} /> Regional Settings</h2>
            <p className="muted">Customise Carvey for your region.</p>
            {params.app === "regional-updated" ? <p className="success">Regional settings saved.</p> : null}
            <form action={updateRegionalSettingsAction} className="record-form">
              <label>
                Currency
                <select name="currency" defaultValue={regionalSettings.currency}>
                  <option value="GBP">GBP (£) — British Pound</option>
                  <option value="USD">USD ($) — US Dollar</option>
                </select>
              </label>
              <label>
                Vehicle identifier label
                <select name="registrationLabel" defaultValue={regionalSettings.registrationLabel}>
                  <option value="registration">Registration</option>
                  <option value="plateNumber">Plate Number</option>
                </select>
              </label>
              <label>
                Annual vehicle test
                <select name="motFeature" defaultValue={regionalSettings.motFeature}>
                  <option value="mot">MOT (UK)</option>
                  <option value="emissionsTest">Emissions Test (US)</option>
                  <option value="disabled">Disabled (hide feature)</option>
                </select>
              </label>
              <label>
                Date format
                <select name="dateFormat" defaultValue={regionalSettings.dateFormat}>
                  <option value="dd-mon-yyyy">DD Mon YYYY (e.g. 01 Jan 2026)</option>
                  <option value="iso">ISO 8601 (e.g. 2026-01-01)</option>
                </select>
              </label>
              <button className="primary-button" type="submit">Save regional settings</button>
            </form>
          </article>

          <article className="settings-panel">
            <h2>Authentication</h2>
            <p className="muted">Disable login when Carvey is deployed behind a trusted reverse proxy that handles authentication.</p>
            {regionalSettings.authDisabled ? <p className="error">Warning: authentication is currently disabled. Anyone who can reach this URL has full access.</p> : null}
            {params.app === "auth-updated" ? <p className="success">Authentication setting saved.</p> : null}
            {params.app === "auth-confirm-required" ? <p className="error">Confirm the change before saving.</p> : null}
            <form action={updateAuthSettingsAction} className="record-form">
              <label className="checkbox-field">
                <input name="authDisabled" type="checkbox" defaultChecked={regionalSettings.authDisabled} />
                Disable authentication
              </label>
              <label className="checkbox-field">
                <input name="confirmed" type="checkbox" required={!regionalSettings.authDisabled} />
                I understand this removes all login protection
              </label>
              <button className="primary-button" type="submit">Save authentication settings</button>
            </form>
          </article>
        </section>
      ) : null}

      {activeTab === "workshops" ? (
        <section className="settings-grid">
          <article className="settings-panel">
            <h2><Building2 size={19} /> Add Garage/Workshop</h2>
            {params.workshop === "created" ? <p className="success">Garage/Workshop saved.</p> : null}
            {params.workshop === "updated" ? <p className="success">Garage/Workshop updated.</p> : null}
            {params.workshop === "deleted" ? <p className="success">Garage/Workshop deleted.</p> : null}
            <WorkshopForm action={createWorkshopAction} button="Save Garage/Workshop" />
          </article>

          <article className="settings-panel workshop-list-panel">
            <h2>Saved Garages & Workshops</h2>
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

      {activeTab === "categories" ? (
        <section className="settings-grid">
          <article className="settings-panel">
            <h2>Add Category</h2>
            {params.category === "created" ? <p className="success">Category saved.</p> : null}
            {params.category === "updated" ? <p className="success">Category updated.</p> : null}
            {params.category === "deleted" ? <p className="success">Category deleted.</p> : null}
            <form action={createMaintenanceCategoryAction} className="record-form">
              <label>
                Name
                <input name="name" required maxLength={100} placeholder="Oil service, tyres, brakes..." />
              </label>
              <button className="primary-button" type="submit">Save category</button>
            </form>
          </article>

          <article className="settings-panel workshop-list-panel">
            <h2>Saved Categories</h2>
            {categories.length ? (
              <div className="workshop-list">
                {categories.map((category) => (
                  <CategoryCard category={category} key={category.id} />
                ))}
              </div>
            ) : <p className="muted">No saved categories yet.</p>}
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
              <strong>{regionalSettings.currency}, miles, {regionalSettings.dateFormat === "iso" ? "ISO dates" : "UK dates"}</strong>
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

          {debugEnabled && debugDemoStatus ? (
            <article className="settings-panel">
              <h2>Debug Tools</h2>
              <p className="muted">Load a curated screenshot garage for demos and GitHub screenshots. This temporarily replaces the live view until you restore the saved snapshot.</p>
              {params.debug === "demo-loaded" ? <p className="success">Showcase demo data loaded.</p> : null}
              {params.debug === "demo-saved" ? <p className="success">Current demo data saved as the showcase backup.</p> : null}
              {params.debug === "previous-restored" ? <p className="success">Previous live data restored.</p> : null}
              {params.debug === "missing-rollback" ? <p className="error">No previous live-data snapshot is available to restore.</p> : null}
              {params.debug === "error" ? <p className="error">{params.message ?? "Debug demo action failed."}</p> : null}
              <dl className="metric-list">
                <span>Demo vehicles</span>
                <strong>{debugDemoStatus.summary?.counts.vehicles ?? "Unavailable"}</strong>
                <span>Logged records</span>
                <strong>{debugDemoStatus.summary ? debugDemoStatus.summary.counts.maintenance + debugDemoStatus.summary.counts.repairs + debugDemoStatus.summary.counts.mots + debugDemoStatus.summary.counts.reminders + debugDemoStatus.summary.counts.plannedPurchases : "Unavailable"}</strong>
                <span>Demo photos/files</span>
                <strong>{debugDemoStatus.summary?.uploadCount ?? "Unavailable"}</strong>
                <span>Status</span>
                <strong>{debugDemoStatus.active ? "Demo active" : "Live data active"}</strong>
              </dl>
              <form action={loadShowcaseDemoDataAction} className="record-form">
                <p className="muted">Safe for screenshots: your current data is snapshotted before the demo garage is applied.</p>
                <button className="secondary-button" type="submit" disabled={!debugDemoStatus.available}>Load showcase demo data</button>
              </form>
              <form action={saveCurrentShowcaseDemoDataAction} className="record-form">
                <p className="muted">While demo mode is active, edits and photo uploads are now synced automatically. Use this to save the current garage to the packaged showcase backup on demand as well.</p>
                <button className="primary-button" type="submit" disabled={!debugDemoStatus.active}>Save current demo data</button>
              </form>
              <form action={restorePreviousDemoDataAction} className="record-form">
                <p className="muted">Return to the last live dataset captured before demo mode was enabled.</p>
                <button className="danger-button" type="submit" disabled={!debugDemoStatus.canRestorePrevious}>Return to previous data</button>
              </form>
            </article>
          ) : null}

          {restoreSummary ? (
            <article className="settings-panel restore-preview">
              <h2><RotateCcw size={19} /> Restore Preview</h2>
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
                <span>To Buy</span>
                <strong>{restoreSummary.counts.plannedPurchases}</strong>
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
        {workshop.preferred ? <span className="tag tag-success">Preferred</span> : null}
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
        Preferred Garage/Workshop
      </label>
      <button className="primary-button" type="submit">{button}</button>
    </form>
  );
}

function CategoryCard({ category }: { category: MaintenanceCategory }) {
  const updateAction = updateMaintenanceCategoryAction.bind(null, category.id);
  const deleteAction = deleteMaintenanceCategoryAction.bind(null, category.id);
  return (
    <article className="workshop-card">
      <h3>{category.name}</h3>
      <details>
        <summary className="secondary-button">Edit</summary>
        <form action={updateAction} className="record-form">
          <label>
            Name
            <input name="name" defaultValue={category.name} required maxLength={100} />
          </label>
          <button className="primary-button" type="submit">Save changes</button>
        </form>
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
