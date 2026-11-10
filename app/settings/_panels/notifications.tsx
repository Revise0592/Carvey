import { BellRing, CalendarDays, Send } from "lucide-react";
import { headers } from "next/headers";
import {
  disableCalendarFeedAction,
  rotateCalendarTokenAction,
  runNotificationsNowAction,
  sendTestNotificationAction,
  updateNotificationSettingsAction
} from "@/app/actions";
import { CopyField } from "@/components/CopyField";
import { getNotificationSettings, NOTIFICATION_PROVIDERS, notificationProviderLabels } from "@/lib/notifications";

const statusMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  saved: { tone: "success", text: "Notification settings saved." },
  "test-sent": { tone: "success", text: "Test notification sent. Check your device." },
  "run-sent": { tone: "success", text: "Summary sent." },
  "run-nothing-due": { tone: "success", text: "Checked: nothing new is due, so nothing was sent." },
  "run-disabled": { tone: "error", text: "Turn notifications on and save a URL first." },
  "calendar-created": { tone: "success", text: "New calendar link created. Any old link has stopped working." },
  "calendar-disabled": { tone: "success", text: "Calendar feed turned off." }
};

const urlPlaceholders: Record<string, string> = {
  ntfy: "https://ntfy.sh/your-private-topic",
  gotify: "https://gotify.example.com",
  apprise: "http://apprise:8000/notify/carvey",
  discord: "https://discord.com/api/webhooks/…",
  webhook: "https://example.com/hooks/carvey"
};

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (host.startsWith("localhost") || /^\d+\.\d+\.\d+\.\d+/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export async function NotificationsPanel({ status, message }: { status?: string; message?: string }) {
  const settings = getNotificationSettings();
  const feedback = status ? statusMessages[status] : undefined;
  const calendarUrl = settings.calendarToken ? `${await requestOrigin()}/calendar/${settings.calendarToken}.ics` : null;

  return (
    <section className="settings-grid">
      <article className="settings-panel">
        <h2><BellRing size={19} /> Notifications</h2>
        <p className="muted">
          Once a day, Carvey sends one summary of the reminders that are coming up or due, including tests and renewals. Mileage-only reminders use the date estimated from your driving.
        </p>
        {feedback ? <p className={feedback.tone}>{feedback.text}</p> : null}
        {status === "error" ? <p className="error">{message ?? "Something went wrong."}</p> : null}
        <form action={updateNotificationSettingsAction} className="record-form">
          <label className="checkbox-field">
            <input name="enabled" type="checkbox" defaultChecked={settings.enabled} />
            Send daily notifications
          </label>
          <label>
            Service
            <select name="provider" defaultValue={settings.provider}>
              {NOTIFICATION_PROVIDERS.map((provider) => <option key={provider} value={provider}>{notificationProviderLabels[provider]}</option>)}
            </select>
          </label>
          <label>
            URL
            <input name="url" type="url" defaultValue={settings.url} placeholder={urlPlaceholders[settings.provider]} autoComplete="off" />
            <small className="field-hint">ntfy: the full topic URL. Gotify: the server URL. Apprise: the /notify endpoint. Discord: the webhook URL.</small>
          </label>
          <label>
            Token
            <input name="token" type="password" autoComplete="new-password" placeholder={settings.token ? "••••••••" : "Access token or app key"} />
            <small className="field-hint">{settings.token ? "A token is saved. Leave this blank to keep it." : "Optional. Needed for Gotify, and for protected ntfy topics."}</small>
          </label>
          {settings.token ? (
            <label className="checkbox-field">
              <input name="clearToken" type="checkbox" />
              Remove the saved token
            </label>
          ) : null}
          <label>
            Warn me this many days ahead
            <input name="leadDays" type="number" min="0" max="90" defaultValue={settings.leadDays} />
          </label>
          <label>
            Send after (hour, server time)
            <input name="hour" type="number" min="0" max="23" defaultValue={settings.hour} />
          </label>
          <button className="primary-button" type="submit">Save notification settings</button>
        </form>
        <div className="button-row">
          <form action={sendTestNotificationAction}>
            <button className="secondary-button" type="submit" disabled={!settings.url}><Send size={16} /> Send test</button>
          </form>
          <form action={runNotificationsNowAction}>
            <button className="secondary-button" type="submit" disabled={!settings.enabled || !settings.url}>Check now</button>
          </form>
        </div>
        {settings.lastResult ? <p className="field-hint">Last check: {formatLastResult(settings.lastResult)}</p> : null}
      </article>

      <article className="settings-panel">
        <h2><CalendarDays size={19} /> Calendar feed</h2>
        <p className="muted">
          Subscribe from Google Calendar, Apple Calendar or Outlook to see every reminder as an all-day event, with an alert {settings.leadDays} days before. Anyone with the link can see your reminders, so keep it private.
        </p>
        {calendarUrl ? (
          <>
            <CopyField value={calendarUrl} label="Calendar link" />
            <p className="muted field-hint">Calendar apps refresh subscribed feeds on their own schedule, usually every few hours.</p>
            <div className="button-row">
              <form action={rotateCalendarTokenAction}>
                <button className="secondary-button" type="submit">Reset link</button>
              </form>
              <form action={disableCalendarFeedAction}>
                <button className="danger-button" type="submit">Turn off</button>
              </form>
            </div>
          </>
        ) : (
          <form action={rotateCalendarTokenAction}>
            <button className="primary-button" type="submit">Create calendar link</button>
          </form>
        )}
      </article>
    </section>
  );
}

/** "2026-11-10T06:29:49.983Z sent — 3 items" → "2026-11-10 06:29 UTC · sent — 3 items" */
function formatLastResult(value: string) {
  const [stamp, ...rest] = value.split(" ");
  const time = stamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return time ? `${time[1]} ${time[2]} UTC · ${rest.join(" ").replace("nothing-due", "nothing new was due")}` : value;
}
