import crypto from "node:crypto";
import { buildAgenda, type AgendaItem } from "./agenda";
import { deleteAppSetting, getAppSettings, hasNotificationBeenSent, markNotificationsSent, pruneNotificationLog, setAppSetting } from "./db";
import { todayIso } from "./dates";
import { formatDate, formatMiles } from "./format";
import { getRegionalSettings, type RegionalSettings } from "./regional-settings";

export const NOTIFICATION_PROVIDERS = ["ntfy", "gotify", "apprise", "discord", "webhook"] as const;
export type NotificationProvider = (typeof NOTIFICATION_PROVIDERS)[number];

export const notificationProviderLabels: Record<NotificationProvider, string> = {
  ntfy: "ntfy",
  gotify: "Gotify",
  apprise: "Apprise API (email, Telegram, Slack and 100+ more)",
  discord: "Discord webhook",
  webhook: "Generic webhook (JSON POST)"
};

export type NotificationSettings = {
  enabled: boolean;
  provider: NotificationProvider;
  url: string;
  token: string;
  /** Send an "upcoming" notice this many days before something is due. */
  leadDays: number;
  /** Local hour (0-23, server TZ) after which the daily check runs. */
  hour: number;
  lastRunDate: string | null;
  lastResult: string | null;
  calendarToken: string | null;
};

const keys = {
  enabled: "notify.enabled",
  provider: "notify.provider",
  url: "notify.url",
  token: "notify.token",
  leadDays: "notify.leadDays",
  hour: "notify.hour",
  lastRunDate: "notify.lastRunDate",
  lastResult: "notify.lastResult",
  calendarToken: "calendar.token"
} as const;

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function getNotificationSettings(): NotificationSettings {
  const stored = getAppSettings();
  const provider = stored.get(keys.provider) as NotificationProvider | undefined;
  return {
    enabled: stored.get(keys.enabled) === "true",
    provider: provider && NOTIFICATION_PROVIDERS.includes(provider) ? provider : "ntfy",
    url: stored.get(keys.url) ?? "",
    token: stored.get(keys.token) ?? "",
    leadDays: clampInt(stored.get(keys.leadDays), 14, 0, 90),
    hour: clampInt(stored.get(keys.hour), 9, 0, 23),
    lastRunDate: stored.get(keys.lastRunDate) ?? null,
    lastResult: stored.get(keys.lastResult) ?? null,
    calendarToken: stored.get(keys.calendarToken) ?? null
  };
}

export function updateNotificationSettings(input: Pick<NotificationSettings, "enabled" | "provider" | "url" | "leadDays" | "hour"> & { token?: string }) {
  setAppSetting(keys.enabled, input.enabled ? "true" : "false");
  setAppSetting(keys.provider, input.provider);
  setAppSetting(keys.url, input.url);
  setAppSetting(keys.leadDays, String(input.leadDays));
  setAppSetting(keys.hour, String(input.hour));
  if (input.token !== undefined) setAppSetting(keys.token, input.token);
}

export function rotateCalendarToken() {
  const token = crypto.randomBytes(24).toString("base64url");
  setAppSetting(keys.calendarToken, token);
  return token;
}

export function disableCalendarFeed() {
  deleteAppSetting(keys.calendarToken);
}

export function calendarTokenMatches(candidate: string) {
  const expected = getNotificationSettings().calendarToken;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ─── Digest ─────────────────────────────────────────────────────────────────

export type DigestStage = "upcoming" | "due";

export type DigestEntry = {
  key: string;
  stage: DigestStage;
  item: AgendaItem;
};

/**
 * Picks the agenda items worth telling someone about today: anything due within the lead time,
 * and anything that has fallen due. Each reminder is announced once per stage per target, keyed
 * on the due date/mileage rather than the moving estimate, so a daily re-estimate never repeats it.
 */
export function selectDigestEntries(agenda: AgendaItem[], leadDays: number, alreadySent: (key: string) => boolean): DigestEntry[] {
  const entries: DigestEntry[] = [];
  for (const item of agenda) {
    const { reminder, daysLeft, status } = item;
    const isDue = status === "overdue" || (daysLeft !== null && daysLeft <= 0);
    const isUpcoming = !isDue && daysLeft !== null && daysLeft <= leadDays;
    if (!isDue && !isUpcoming) continue;
    const stage: DigestStage = isDue ? "due" : "upcoming";
    const key = `reminder:${reminder.id}:${reminder.dueDate ?? ""}:${reminder.dueOdometer ?? ""}:${stage}`;
    if (alreadySent(key)) continue;
    entries.push({ key, stage, item });
  }
  return entries;
}

function describeEntry({ item, stage }: DigestEntry, settings: RegionalSettings) {
  const { reminder, timing, daysLeft } = item;
  const when = (() => {
    if (stage === "due") {
      if (reminder.dueDate && daysLeft !== null && daysLeft < 0) return `overdue since ${formatDate(reminder.dueDate, settings)}`;
      if (reminder.dueOdometer !== null && reminder.currentOdometer !== null && reminder.currentOdometer >= reminder.dueOdometer) return `due now (${formatMiles(reminder.dueOdometer, settings)})`;
      if (timing.estimatedDate) return `probably due now (${formatMiles(reminder.dueOdometer, settings)})`;
      return "due today";
    }
    const date = timing.effectiveDate ? formatDate(timing.effectiveDate, settings) : "";
    return timing.estimatedDate ? `around ${date} (${formatMiles(reminder.dueOdometer, settings)})` : `due ${date}`;
  })();
  return `${reminder.title} · ${item.vehicleName} (${reminder.registration.toUpperCase()}): ${when}`;
}

export function formatDigest(entries: DigestEntry[], settings: RegionalSettings) {
  const due = entries.filter((entry) => entry.stage === "due");
  const upcoming = entries.filter((entry) => entry.stage === "upcoming");
  const title = due.length
    ? `Carvey: ${due.length} ${due.length === 1 ? "item" : "items"} due${upcoming.length ? `, ${upcoming.length} coming up` : ""}`
    : `Carvey: ${upcoming.length} ${upcoming.length === 1 ? "item" : "items"} coming up`;
  const lines = [
    ...(due.length ? ["Due now:", ...due.map((entry) => `• ${describeEntry(entry, settings)}`)] : []),
    ...(due.length && upcoming.length ? [""] : []),
    ...(upcoming.length ? ["Coming up:", ...upcoming.map((entry) => `• ${describeEntry(entry, settings)}`)] : [])
  ];
  return { title, body: lines.join("\n") };
}

// ─── Delivery ───────────────────────────────────────────────────────────────

export type OutgoingMessage = { title: string; body: string; entries?: DigestEntry[] };

/** Builds the HTTP request for a provider. Exported for tests; `sendNotification` performs it. */
export function buildProviderRequest(settings: Pick<NotificationSettings, "provider" | "url" | "token">, message: OutgoingMessage): { url: string; init: RequestInit } {
  const url = settings.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Enter a full http:// or https:// URL.");
  const json = (payload: unknown, headers: Record<string, string> = {}) => ({
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload)
  });
  const bearer: Record<string, string> = settings.token ? { authorization: `Bearer ${settings.token}` } : {};

  switch (settings.provider) {
    case "ntfy":
      // ntfy headers must be ASCII, so the title travels in the JSON body via the topic root instead.
      return {
        url: url.replace(/\/+$/, "").replace(/\/[^/]+$/, ""),
        init: json({ topic: url.replace(/\/+$/, "").split("/").pop(), title: message.title, message: message.body, tags: ["car"] }, bearer)
      };
    case "gotify": {
      const base = url.replace(/\/+$/, "").replace(/\/message$/, "");
      return { url: `${base}/message`, init: json({ title: message.title, message: message.body, priority: 5 }, settings.token ? { "x-gotify-key": settings.token } : {}) };
    }
    case "apprise":
      return { url, init: json({ title: message.title, body: message.body, type: "info" }, bearer) };
    case "discord":
      return { url, init: json({ content: `**${message.title}**\n${message.body}`.slice(0, 2000) }) };
    case "webhook":
      return {
        url,
        init: json({
          title: message.title,
          body: message.body,
          items: (message.entries ?? []).map(({ stage, item }) => ({
            stage,
            reminderId: item.reminder.id,
            title: item.reminder.title,
            vehicleId: item.reminder.vehicleId,
            vehicle: item.vehicleName,
            registration: item.reminder.registration,
            dueDate: item.reminder.dueDate,
            dueOdometer: item.reminder.dueOdometer,
            expectedDate: item.timing.effectiveDate
          }))
        }, bearer)
      };
  }
}

export async function sendNotification(settings: Pick<NotificationSettings, "provider" | "url" | "token">, message: OutgoingMessage) {
  const { url, init } = buildProviderRequest(settings, message);
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`${settings.provider} returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
}

// ─── Daily run ──────────────────────────────────────────────────────────────

export type RunResult = { status: "disabled" | "not-yet" | "already-ran" | "nothing-due" | "sent" | "failed"; detail?: string };

/**
 * Runs the daily check if it is enabled, past the configured hour and hasn't run today.
 * `force` skips the time checks (used by the "check now" button).
 */
export async function runDailyNotifications(options: { now?: Date; force?: boolean } = {}): Promise<RunResult> {
  const now = options.now ?? new Date();
  const settings = getNotificationSettings();
  if (!settings.enabled || !settings.url) return { status: "disabled" };
  const today = todayIso();
  if (!options.force) {
    if (now.getHours() < settings.hour) return { status: "not-yet" };
    if (settings.lastRunDate === today) return { status: "already-ran" };
  }

  const record = (result: RunResult) => {
    setAppSetting(keys.lastRunDate, today);
    setAppSetting(keys.lastResult, `${now.toISOString()} ${result.status}${result.detail ? ` — ${result.detail}` : ""}`);
    return result;
  };

  const entries = selectDigestEntries(buildAgenda(today), settings.leadDays, hasNotificationBeenSent);
  if (!entries.length) return record({ status: "nothing-due" });

  try {
    await sendNotification(settings, { ...formatDigest(entries, getRegionalSettings()), entries });
    markNotificationsSent(entries.map((entry) => entry.key));
    pruneNotificationLog();
    return record({ status: "sent", detail: `${entries.length} ${entries.length === 1 ? "item" : "items"}` });
  } catch (error) {
    // Leave lastRunDate unset on failure so the next tick retries.
    const detail = error instanceof Error ? error.message : String(error);
    setAppSetting(keys.lastResult, `${now.toISOString()} failed — ${detail}`);
    return { status: "failed", detail };
  }
}

let schedulerStarted = false;

/** Starts the in-process scheduler. Called once from instrumentation when the server boots. */
export function startNotificationScheduler(intervalMs = 15 * 60 * 1000) {
  if (schedulerStarted) return;
  schedulerStarted = true;
  const tick = () => {
    runDailyNotifications().catch((error) => console.error("[Carvey] Notification check failed:", error));
  };
  setTimeout(tick, 30_000).unref?.();
  setInterval(tick, intervalMs).unref?.();
}
