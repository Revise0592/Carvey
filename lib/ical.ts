import type { AgendaItem } from "./agenda";
import { addDays } from "./dates";
import { formatMiles } from "./format";
import type { RegionalSettings } from "./regional-settings";

/** Escapes TEXT values per RFC 5545 §3.3.11. */
export function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds content lines longer than 75 octets, continuing with a leading space (RFC 5545 §3.1). */
export function foldIcsLine(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const icsDate = (isoDate: string) => isoDate.slice(0, 10).replaceAll("-", "");

function icsTimestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * An all-day event per open reminder that has a due date or a mileage-based estimate, with an
 * alarm `leadDays` before. UIDs are stable per reminder so calendar apps update events in place.
 */
export function buildCalendar(agenda: AgendaItem[], options: { settings: RegionalSettings; leadDays: number; now?: Date; calendarName?: string }) {
  const stamp = icsTimestamp(options.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carvey//Car maintenance//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.calendarName ?? "Carvey")}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H"
  ];

  for (const item of agenda) {
    const date = item.timing.effectiveDate;
    if (!date) continue;
    const { reminder } = item;
    const description = [
      `${item.vehicleName} (${reminder.registration.toUpperCase()})`,
      reminder.dueOdometer !== null ? `Due at ${formatMiles(reminder.dueOdometer, options.settings)}` : null,
      item.timing.estimatedDate ? "Date estimated from recent mileage; it moves as you log more readings." : null,
      reminder.recurrence ? `Repeats ${reminder.recurrence}` : null
    ].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:carvey-reminder-${reminder.id}@carvey`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(date, 1))}`,
      `SUMMARY:${escapeIcsText(`${item.timing.estimatedDate ? "≈ " : ""}${reminder.title} · ${item.vehicleName}`)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "TRANSP:TRANSPARENT"
    );
    if (options.leadDays > 0) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsText(reminder.title)}`,
        `TRIGGER:-P${options.leadDays}D`,
        "END:VALARM"
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
