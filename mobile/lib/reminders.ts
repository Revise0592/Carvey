import type { Reminder, Vehicle } from "./db";
import { todayIso } from "./format";

export type ReminderStatus = "done" | "overdue" | "upcoming" | "open";

export function getReminderStatus(
  reminder: Pick<Reminder, "completedAt" | "dueDate" | "dueOdometer">,
  vehicle: Pick<Vehicle, "currentOdometer">
): ReminderStatus {
  if (reminder.completedAt) return "done";
  const today = todayIso();
  const dateOverdue = reminder.dueDate ? reminder.dueDate < today : false;
  const mileageOverdue =
    reminder.dueOdometer !== null &&
    reminder.dueOdometer !== undefined &&
    vehicle.currentOdometer !== null &&
    vehicle.currentOdometer !== undefined &&
    vehicle.currentOdometer >= reminder.dueOdometer;

  if (dateOverdue || mileageOverdue) return "overdue";
  if (reminder.dueDate || reminder.dueOdometer) return "upcoming";
  return "open";
}
