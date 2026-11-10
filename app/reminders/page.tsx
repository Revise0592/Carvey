import Link from "next/link";
import { BellRing, ChevronRight, FileBadge, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { buildAgenda, type AgendaItem } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { daysUntil } from "@/lib/dates";
import { listCurrentRenewals, listLatestMotExpiries } from "@/lib/db";
import { formatDate, formatMiles } from "@/lib/format";
import { getMotLabel, getRegionalSettings, type RegionalSettings } from "@/lib/regional-settings";
import { renewalTypeLabels } from "@/lib/renewals";

export const dynamic = "force-dynamic";

function relativeDays(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

function expiryTone(days: number) {
  return days < 0 ? "tag-danger" : days <= 30 ? "tag-warning" : "tag-neutral";
}

export default async function RemindersPage() {
  await requireUser();
  const settings = getRegionalSettings();
  const motLabel = getMotLabel(settings);
  const agenda = buildAgenda();
  const mots = settings.motFeature !== "disabled" ? listLatestMotExpiries() : [];
  const renewals = listCurrentRenewals();
  // Renewal reminders are already shown in the Renewals section above, so don't list them twice.
  const reminders = agenda.filter((item) => !item.reminder.renewalType);

  const groups = [
    { key: "overdue", label: "Overdue", tone: "tag-danger", items: reminders.filter((item) => item.status === "overdue") },
    { key: "upcoming", label: "Upcoming", tone: "tag-warning", items: reminders.filter((item) => item.status === "upcoming") },
    { key: "open", label: "No due date", tone: "tag-neutral", items: reminders.filter((item) => item.status === "open") }
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
                return (
                  <Link key={mot.vehicleId} href={`/vehicles/${mot.vehicleId}?tab=mots`} className="inset-row">
                    <span className="inset-row-text">
                      <strong>{mot.make} {mot.model}</strong>
                      <small>{mot.registration.toUpperCase()} · {days < 0 ? "Expired" : "Expires"} {formatDate(mot.expiryDate, settings)}</small>
                    </span>
                    <span className={`tag ${expiryTone(days)}`}>{relativeDays(days)}</span>
                    <ChevronRight size={18} className="inset-row-chevron" />
                  </Link>
                );
              })}
            </div>
          ) : <p className="inset-empty">No {motLabel.toLowerCase()}s logged yet.</p>}
        </section>
      ) : null}

      {renewals.length ? (
        <section className="grouped-section">
          <h2 className="group-label"><FileBadge size={15} /> Renewals</h2>
          <div className="inset-list">
            {renewals.map((renewal) => {
              const days = daysUntil(renewal.endDate);
              return (
                <Link key={renewal.id} href={`/vehicles/${renewal.vehicleId}?tab=renewals`} className="inset-row">
                  <span className="inset-row-text">
                    <strong>{renewalTypeLabels[renewal.type]}{renewal.provider ? ` · ${renewal.provider}` : ""}</strong>
                    <small>{renewal.make} {renewal.model} · {days < 0 ? "Ended" : "Ends"} {formatDate(renewal.endDate, settings)}</small>
                  </span>
                  <span className={`tag ${expiryTone(days)}`}>{relativeDays(days)}</span>
                  <ChevronRight size={18} className="inset-row-chevron" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {groups.length ? groups.map((group) => (
        <section className="grouped-section" key={group.key}>
          <h2 className="group-label"><BellRing size={15} /> {group.label} <span className="group-count">{group.items.length}</span></h2>
          <div className="inset-list">
            {group.items.map((item) => (
              <ReminderRow key={item.reminder.id} item={item} tone={group.tone} settings={settings} />
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

function ReminderRow({ item, tone, settings }: { item: AgendaItem; tone: string; settings: RegionalSettings }) {
  const { reminder, timing, daysLeft } = item;
  const due = [
    reminder.dueDate ? formatDate(reminder.dueDate, settings) : null,
    reminder.dueOdometer ? formatMiles(reminder.dueOdometer, settings) : null
  ].filter(Boolean).join(" or ");
  const estimate = timing.estimatedDate && !timing.probablyReached ? ` · ≈ ${formatDate(timing.estimatedDate, settings)}` : "";
  const mileageLeft = reminder.dueOdometer !== null && reminder.currentOdometer !== null ? reminder.dueOdometer - reminder.currentOdometer : null;

  let badge = "Open";
  if (item.status === "overdue" && mileageLeft !== null && mileageLeft <= 0) badge = "Mileage reached";
  else if (timing.probablyReached) badge = "Probably reached";
  else if (daysLeft !== null) badge = relativeDays(daysLeft);
  else if (mileageLeft !== null) badge = `${formatMiles(mileageLeft, settings)} to go`;

  return (
    <Link href={`/vehicles/${reminder.vehicleId}?tab=reminders`} className="inset-row">
      <span className="inset-row-text">
        <strong>{reminder.title}</strong>
        <small>{item.vehicleName}{due ? ` · Due ${due}` : ""}{estimate}</small>
      </span>
      <span className={`tag ${tone}`}>{badge}</span>
      <ChevronRight size={18} className="inset-row-chevron" />
    </Link>
  );
}
