import { CalendarClock } from "lucide-react";
import { runScheduledBackupNowAction, updateScheduledBackupSettingsAction } from "@/app/actions";
import { BACKUP_HOUR, BACKUP_KEEP_OPTIONS, getScheduledBackupSettings, listScheduledBackups } from "@/lib/scheduled-backups";

const messages: Record<string, { tone: "success" | "error"; text: string }> = {
  saved: { tone: "success", text: "Automatic backup settings saved." },
  done: { tone: "success", text: "Backup created." }
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Settings → Backup: nightly backups kept in data/backups/. */
export async function BackupSchedulePanel({ status, message }: { status?: string; message?: string }) {
  const settings = getScheduledBackupSettings();
  const files = await listScheduledBackups();
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const feedback = status === "failed" ? { tone: "error" as const, text: `Backup failed: ${message ?? "unknown error"}` } : status ? messages[status] : undefined;

  return (
    <article className="settings-panel">
      <h2><CalendarClock size={19} /> Automatic backups</h2>
      <p className="muted">
        Every night after {String(BACKUP_HOUR).padStart(2, "0")}:00, Carvey saves a full backup to the <code>backups</code> folder in its data directory
        and keeps the newest few. Copy that folder somewhere else (restic, rsync, your NAS backup) to survive a disk failure.
      </p>
      {feedback ? <p className={feedback.tone}>{feedback.text}</p> : null}
      <form action={updateScheduledBackupSettingsAction} className="record-form">
        <label className="checkbox-field">
          <input name="enabled" type="checkbox" defaultChecked={settings.enabled} />
          Back up automatically every night
        </label>
        <label>
          Backups to keep
          <select name="keep" defaultValue={String(settings.keep)}>
            {BACKUP_KEEP_OPTIONS.map((keep) => <option key={keep} value={keep}>{keep}</option>)}
          </select>
        </label>
        <button className="secondary-button" type="submit">Save</button>
      </form>
      {settings.lastResult ? <p className="muted">Last run: {settings.lastResult}</p> : null}
      {files.length ? (
        <>
          <ul className="backup-file-list">
            {files.map((file) => (
              <li key={file.name}>
                <a href={`/settings/backup?file=${encodeURIComponent(file.name)}`}>{file.name}</a>
                <span className="muted"> · {formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
          <p className="muted">{files.length} {files.length === 1 ? "backup" : "backups"}, {formatBytes(total)} in total.</p>
        </>
      ) : <p className="muted">No automatic backups yet.</p>}
      <form action={runScheduledBackupNowAction}>
        <button className="secondary-button" type="submit">Back up now</button>
      </form>
    </article>
  );
}
