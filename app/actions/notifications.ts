"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  disableCalendarFeed,
  getNotificationSettings,
  NOTIFICATION_PROVIDERS,
  rotateCalendarToken,
  runDailyNotifications,
  sendNotification,
  updateNotificationSettings
} from "@/lib/notifications";
import { str } from "./shared";

function notificationsUrl(status: string, message?: string) {
  const params = new URLSearchParams({ tab: "notifications", notify: status });
  if (message) params.set("message", message.slice(0, 300));
  return `/settings?${params}`;
}

export async function updateNotificationSettingsAction(formData: FormData) {
  await requireUser();
  const url = str(formData, "url");
  if (url && !/^https?:\/\//i.test(url)) redirect(notificationsUrl("error", "Enter a full http:// or https:// URL."));
  const token = str(formData, "token");
  updateNotificationSettings({
    enabled: str(formData, "enabled") === "on",
    provider: z.enum(NOTIFICATION_PROVIDERS).parse(str(formData, "provider")),
    url,
    leadDays: z.coerce.number().int().min(0).max(90).parse(str(formData, "leadDays") || "14"),
    hour: z.coerce.number().int().min(0).max(23).parse(str(formData, "hour") || "9"),
    // A blank token field keeps the saved one, so it never has to be echoed back into the page.
    token: str(formData, "clearToken") === "on" ? "" : token || undefined
  });
  revalidatePath("/settings");
  redirect(notificationsUrl("saved"));
}

export async function sendTestNotificationAction() {
  await requireUser();
  const settings = getNotificationSettings();
  if (!settings.url) redirect(notificationsUrl("error", "Save a notification URL first."));
  let failure: string | null = null;
  try {
    await sendNotification(settings, { title: "Carvey test notification", body: "Notifications are working. You'll get a daily summary when reminders are coming up or due." });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  }
  redirect(failure ? notificationsUrl("error", failure) : notificationsUrl("test-sent"));
}

export async function runNotificationsNowAction() {
  await requireUser();
  const result = await runDailyNotifications({ force: true });
  revalidatePath("/settings");
  if (result.status === "failed") redirect(notificationsUrl("error", result.detail));
  redirect(notificationsUrl(`run-${result.status}`, result.detail));
}

export async function rotateCalendarTokenAction() {
  await requireUser();
  rotateCalendarToken();
  revalidatePath("/settings");
  redirect(notificationsUrl("calendar-created"));
}

export async function disableCalendarFeedAction() {
  await requireUser();
  disableCalendarFeed();
  revalidatePath("/settings");
  redirect(notificationsUrl("calendar-disabled"));
}
