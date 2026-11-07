import Link from "next/link";
import { BellRing, ChevronRight, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth";
import { listLatestMotExpiries, listOpenReminders, type OpenReminder } from "@/lib/db";
import { formatDate, formatMiles, todayIso } from "@/lib/format";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";
import { getReminderStatus } from "@/lib/reminders";

export const dynamic = "force-dynamic";

function daysUntil(isoDate: string) {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function relativeDays(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export default async function RemindersPage() {
  await requireUser();
  const settings = getRegionalSettings();
  const motLabel = getMotLabel(settings);
  const reminders = listOpenReminders().map((reminder) => ({ reminder, status: getReminderStatus(reminder, reminder) }));
  const mots = settings.motFeature !== "disabled" ? listLatestMotExpiries() : [];

  const groups = [
    { key: "overdue", label: "Overdue", tone: "tag-danger", items: reminders.filter((r) => r.status === "overdue") },
    { key: "upcoming", label: "Upcoming", tone: "tag-warning", items: reminders.filter((r) => r.status === "upcoming") },
    { key: "open", label: "No due date", tone: "tag-neutral", items: reminders.filter((r) => r.status === "open") }
  ].filter((group) => group.items.length);

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Across your garage</p>
          <h1>Reminders</h1>
        </div>
      </section>

      {settings.motFeature !== "disabled" ? (
        <section className="grouped-section">
          <h2 className="group-label"><ShieldCheck size={15} /> {motLabel} expiry</h2>
          {mots.length ? (
            <div className="inset-list">
              {mots.map((mot) => {
                const days = daysUntil(mot.expiryDate);
                const tone = days < 0 ? "tag-danger" : days <= 30 ? "tag-warning" : "tag-neutral";
                return (
                  <Link key={mot.vehicleId} href={`/vehicles/${mot.vehicleId}?tab=mots`} className="inset-row">
                    <span className="inset-row-text">
                      <strong>{mot.make} {mot.model}</strong>
                      <small>{mot.registration.toUpperCase()} · {days < 0 ? "Expired" : "Expires"} {formatDate(mot.expiryDate, settings)}</small>
                    </span>
                    <span className={`tag ${tone}`}>{relativeDays(days)}</span>
                    <ChevronRight size={18} className="inset-row-chevron" />
                  </Link>
                );
              })}
            </div>
          ) : <p className="inset-empty">No {motLabel.toLowerCase()}s logged yet.</p>}
        </section>
      ) : null}

      {groups.length ? groups.map((group) => (
        <section className="grouped-section" key={group.key}>
          <h2 className="group-label"><BellRing size={15} /> {group.label} <span className="group-count">{group.items.length}</span></h2>
          <div className="inset-list">
            {group.items.map(({ reminder }) => (
              <ReminderRow key={reminder.id} reminder={reminder} tone={group.tone} settings={settings} />
            ))}
          </div>
        </section>
      )) : (
        <section className="grouped-section">
          <h2 className="group-label"><BellRing size={15} /> Reminders</h2>
          <p className="inset-empty">You&apos;re all caught up. No open reminders.</p>
        </section>
      )}
    </AppFrame>
  );
}

function ReminderRow({ reminder, tone, settings }: { reminder: OpenReminder; tone: string; settings: ReturnType<typeof getRegionalSettings> }) {
  const due = [
    reminder.dueDate ? formatDate(reminder.dueDate, settings) : null,
    reminder.dueOdometer ? formatMiles(reminder.dueOdometer, settings) : null
  ].filter(Boolean).join(" or ");
  const badge = reminder.dueDate ? relativeDays(daysUntil(reminder.dueDate)) : reminder.dueOdometer && reminder.currentOdometer !== null
    ? reminder.dueOdometer - reminder.currentOdometer > 0
      ? `${formatMiles(reminder.dueOdometer - reminder.currentOdometer, settings)} to go`
      : "Mileage reached"
    : "Open";
  return (
    <Link href={`/vehicles/${reminder.vehicleId}?tab=reminders`} className="inset-row">
      <span className="inset-row-text">
        <strong>{reminder.title}</strong>
        <small>{reminder.make} {reminder.model}{due ? ` · Due ${due}` : ""}</small>
      </span>
      <span className={`tag ${tone}`}>{badge}</span>
      <ChevronRight size={18} className="inset-row-chevron" />
    </Link>
  );
}
