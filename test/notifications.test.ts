import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgendaItem } from "@/lib/agenda";
import { buildCalendar, escapeIcsText, foldIcsLine } from "@/lib/ical";
import { buildProviderRequest, formatDigest, selectDigestEntries } from "@/lib/notifications";
import type { RegionalSettings } from "@/lib/regional-settings";

const settings: RegionalSettings = {
  currency: "GBP", fuelVolumeUnit: "litres", motFeature: "mot", motCustomLabel: "", dateFormat: "iso",
  distanceUnit: "miles", plateStyle: "uk-yellow", authDisabled: false, fuelDisabled: false
};

function item(overrides: Partial<AgendaItem["reminder"]> & { daysLeft: number | null; status?: AgendaItem["status"]; estimatedDate?: string | null; effectiveDate?: string | null }): AgendaItem {
  const { daysLeft, status, estimatedDate = null, effectiveDate = null, ...reminder } = overrides;
  return {
    reminder: {
      id: 1, vehicleId: 1, title: "Oil change", dueDate: null, dueOdometer: null, recurrence: null, completedAt: null, renewalType: null,
      createdAt: "", make: "Honda", model: "Civic", registration: "ab12cde", currentOdometer: 10_000, ...reminder
    },
    status: status ?? "upcoming",
    timing: { effectiveDate, estimatedDate, probablyReached: false },
    daysLeft,
    vehicleName: "Honda Civic"
  };
}

describe("notification digest", () => {
  it("announces upcoming and due items once per stage and target", () => {
    const agenda = [
      item({ id: 1, dueDate: "2026-11-20", effectiveDate: "2026-11-20", daysLeft: 10 }),
      item({ id: 2, dueDate: "2026-11-01", effectiveDate: "2026-11-01", daysLeft: -9, status: "overdue" }),
      item({ id: 3, dueDate: "2027-03-01", effectiveDate: "2027-03-01", daysLeft: 111 }),
      item({ id: 4, daysLeft: null, status: "open" }),
      item({ id: 5, dueOdometer: 12_000, estimatedDate: "2026-11-15", effectiveDate: "2026-11-15", daysLeft: 5 })
    ];
    const entries = selectDigestEntries(agenda, 14, () => false);
    expect(entries.map((e) => [e.item.reminder.id, e.stage])).toEqual([[1, "upcoming"], [2, "due"], [5, "upcoming"]]);
    expect(entries[2].key).toBe("reminder:5::12000:upcoming");

    const sent = new Set(entries.map((e) => e.key));
    expect(selectDigestEntries(agenda, 14, (key) => sent.has(key))).toEqual([]);
    // Once the upcoming item falls due it gets a second, "due" notice.
    const later = [item({ id: 1, dueDate: "2026-11-20", effectiveDate: "2026-11-20", daysLeft: 0 })];
    expect(selectDigestEntries(later, 14, (key) => sent.has(key)).map((e) => e.stage)).toEqual(["due"]);
  });

  it("formats a readable summary", () => {
    const entries = selectDigestEntries([
      item({ id: 2, title: "MOT due", dueDate: "2026-11-01", effectiveDate: "2026-11-01", daysLeft: -9, status: "overdue" }),
      item({ id: 5, dueOdometer: 12_000, estimatedDate: "2026-11-15", effectiveDate: "2026-11-15", daysLeft: 5 })
    ], 14, () => false);
    const digest = formatDigest(entries, settings);
    expect(digest.title).toBe("Carvey: 1 item due, 1 coming up");
    expect(digest.body).toBe([
      "Due now:",
      "• MOT due · Honda Civic (AB12CDE): overdue since 2026-11-01",
      "",
      "Coming up:",
      "• Oil change · Honda Civic (AB12CDE): around 2026-11-15 (12,000 miles)"
    ].join("\n"));
  });

  it("builds a request for each provider", () => {
    const message = { title: "T", body: "B" };
    const ntfy = buildProviderRequest({ provider: "ntfy", url: "https://ntfy.example.com/sub/my-topic/", token: "tk" }, message);
    expect(ntfy.url).toBe("https://ntfy.example.com/sub");
    expect(JSON.parse(ntfy.init.body as string)).toMatchObject({ topic: "my-topic", title: "T", message: "B" });
    expect((ntfy.init.headers as Record<string, string>).authorization).toBe("Bearer tk");

    const gotify = buildProviderRequest({ provider: "gotify", url: "https://gotify.example.com/", token: "app" }, message);
    expect(gotify.url).toBe("https://gotify.example.com/message");
    expect((gotify.init.headers as Record<string, string>)["x-gotify-key"]).toBe("app");

    const discord = buildProviderRequest({ provider: "discord", url: "https://discord.com/api/webhooks/1/x", token: "" }, message);
    expect(JSON.parse(discord.init.body as string)).toEqual({ content: "**T**\nB" });

    expect(() => buildProviderRequest({ provider: "apprise", url: "apprise:8000", token: "" }, message)).toThrow(/http/);
  });
});

describe("calendar feed", () => {
  it("escapes and folds lines per RFC 5545", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const folded = foldIcsLine(`SUMMARY:${"é".repeat(60)}`);
    for (const line of folded.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    expect(folded.split("\r\n").map((line, i) => (i ? line.slice(1) : line)).join("")).toBe(`SUMMARY:${"é".repeat(60)}`);
  });

  it("emits an all-day event with an alarm for each dated item", () => {
    const ics = buildCalendar([
      item({ id: 7, title: "Insurance renewal", dueDate: "2027-01-31", effectiveDate: "2027-01-31", daysLeft: 80 }),
      item({ id: 8, dueOdometer: 15_000, estimatedDate: "2027-02-10", effectiveDate: "2027-02-10", daysLeft: 90 }),
      item({ id: 9, daysLeft: null, status: "open" })
    ], { settings, leadDays: 7, now: new Date("2026-11-10T08:00:00Z") });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("UID:carvey-reminder-7@carvey\r\nDTSTAMP:20261110T080000Z\r\nDTSTART;VALUE=DATE:20270131\r\nDTEND;VALUE=DATE:20270201");
    expect(ics).toContain("SUMMARY:≈ Oil change · Honda Civic");
    expect(ics).toContain("TRIGGER:-P7D");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("daily run", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends once a day after the configured hour and never repeats an item", async () => {
    process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-notify-"));
    const db = await import("@/lib/db");
    const notifications = await import("@/lib/notifications");
    const vehicleId = Number(db.createVehicle({ make: "Honda", model: "Civic", year: null, registration: "AB12CDE", vin: null, currentOdometer: null, purchasePrice: null, purchaseDate: null, notes: null }).lastInsertRowid);
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    db.createReminder({ vehicleId, title: "Brakes", dueDate: soon, dueOdometer: null, recurrence: null });

    const calls: Array<{ url: string; body: unknown }> = [];
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response("ok");
    }) as typeof fetch;

    expect(await notifications.runDailyNotifications()).toEqual({ status: "disabled" });
    notifications.updateNotificationSettings({ enabled: true, provider: "webhook", url: "https://hooks.example.com/carvey", leadDays: 14, hour: 9 });

    const morning = new Date();
    morning.setHours(6, 0, 0, 0);
    expect((await notifications.runDailyNotifications({ now: morning })).status).toBe("not-yet");

    const afterHour = new Date();
    afterHour.setHours(10, 0, 0, 0);
    expect(await notifications.runDailyNotifications({ now: afterHour })).toMatchObject({ status: "sent" });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ title: "Carvey: 1 item coming up", items: [{ title: "Brakes", registration: "AB12CDE", dueDate: soon }] });

    expect((await notifications.runDailyNotifications({ now: afterHour })).status).toBe("already-ran");
    expect((await notifications.runDailyNotifications({ now: afterHour, force: true })).status).toBe("nothing-due");
    expect(calls).toHaveLength(1);
    db.closeDbForTests();
  });

  it("retries on the next tick when delivery fails", async () => {
    process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-notify-fail-"));
    const db = await import("@/lib/db");
    const notifications = await import("@/lib/notifications");
    const vehicleId = Number(db.createVehicle({ make: "Mazda", model: "MX-5", year: null, registration: "MX5", vin: null, currentOdometer: null, purchasePrice: null, purchaseDate: null, notes: null }).lastInsertRowid);
    db.createReminder({ vehicleId, title: "Tax", dueDate: "2020-01-01", dueOdometer: null, recurrence: null });
    notifications.updateNotificationSettings({ enabled: true, provider: "ntfy", url: "https://ntfy.example.com/topic", leadDays: 14, hour: 0 });

    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as typeof fetch;
    expect(await notifications.runDailyNotifications()).toMatchObject({ status: "failed", detail: "ntfy returned 500: nope" });
    globalThis.fetch = vi.fn(async () => new Response("ok")) as typeof fetch;
    expect(await notifications.runDailyNotifications()).toMatchObject({ status: "sent" });
    db.closeDbForTests();
  });

  it("checks calendar tokens in constant time and supports resets", async () => {
    process.env.CARVEY_DATA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "carvey-calendar-"));
    const db = await import("@/lib/db");
    const notifications = await import("@/lib/notifications");
    expect(notifications.calendarTokenMatches("anything")).toBe(false);
    const first = notifications.rotateCalendarToken();
    expect(notifications.calendarTokenMatches(first)).toBe(true);
    const second = notifications.rotateCalendarToken();
    expect(notifications.calendarTokenMatches(first)).toBe(false);
    expect(notifications.calendarTokenMatches(second)).toBe(true);
    notifications.disableCalendarFeed();
    expect(notifications.calendarTokenMatches(second)).toBe(false);
    db.closeDbForTests();
  });
});
