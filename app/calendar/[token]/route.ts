import { buildAgenda } from "@/lib/agenda";
import { getCollectionName } from "@/lib/db";
import { buildCalendar } from "@/lib/ical";
import { calendarTokenMatches, getNotificationSettings } from "@/lib/notifications";
import { getRegionalSettings } from "@/lib/regional-settings";

export const dynamic = "force-dynamic";

/**
 * Subscribable calendar feed of upcoming reminders. Calendar apps can't sign in, so access is by
 * an unguessable token in the URL (`/calendar/<token>.ics`), which can be reset in Settings.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!calendarTokenMatches(token.replace(/\.ics$/, ""))) {
    return new Response("Not found", { status: 404 });
  }
  const body = buildCalendar(buildAgenda(), {
    settings: getRegionalSettings(),
    leadDays: getNotificationSettings().leadDays,
    calendarName: `Carvey · ${getCollectionName()}`
  });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="carvey.ics"',
      "cache-control": "no-store"
    }
  });
}
