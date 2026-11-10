import { listOdometerReadings, listOpenReminders, type OpenReminder } from "./db";
import { daysUntil, todayIso } from "./dates";
import { mileageRatesByVehicle, reminderTiming, type ReminderTiming } from "./mileage";
import { getReminderStatus, type ReminderStatus } from "./reminders";

export type AgendaItem = {
  reminder: OpenReminder;
  status: ReminderStatus;
  timing: ReminderTiming;
  /** Days until the effective date; null when the reminder has neither a date nor an estimate. */
  daysLeft: number | null;
  vehicleName: string;
};

/**
 * Every open reminder across active vehicles, with mileage-only targets turned into an estimated
 * date from each vehicle's driving history. Sorted by the date each item is expected to fall due.
 */
export function buildAgenda(today = todayIso()): AgendaItem[] {
  const rates = mileageRatesByVehicle(listOdometerReadings());
  const items = listOpenReminders().map((reminder) => {
    const timing = reminderTiming(reminder, rates.get(reminder.vehicleId) ?? null, today);
    return {
      reminder,
      status: getReminderStatus(reminder, reminder),
      timing,
      daysLeft: timing.effectiveDate ? daysUntil(timing.effectiveDate, today) : null,
      vehicleName: `${reminder.make} ${reminder.model}`.trim()
    };
  });
  return items.sort((a, b) => {
    if (a.daysLeft === null && b.daysLeft === null) return 0;
    if (a.daysLeft === null) return 1;
    if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });
}
