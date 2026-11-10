import { addMonths } from "../dates";
import { getDb } from "./connection";
import { createMaintenance } from "./records";
import type { Reminder, ServiceInterval, VehicleServiceInterval } from "./types";
import { getVehicle } from "./vehicles";

export const reminderSelect = `
  reminders.id,
  reminders.vehicle_id as vehicleId,
  reminders.title,
  reminders.due_date as dueDate,
  reminders.due_odometer as dueOdometer,
  reminders.recurrence,
  reminders.completed_at as completedAt,
  reminders.renewal_type as renewalType,
  reminders.created_at as createdAt
`;

export type ReminderInput = Omit<Reminder, "id" | "createdAt" | "completedAt" | "renewalType"> & { renewalType?: Reminder["renewalType"] };

export function listReminders(vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${reminderSelect} FROM reminders WHERE vehicle_id = ? ORDER BY completed_at ASC, due_date ASC, due_odometer ASC`)
    .all(vehicleId) as Reminder[];
}

export function getReminder(id: number, vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${reminderSelect} FROM reminders WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as Reminder | undefined;
}

export function createReminder(input: ReminderInput) {
  return getDb()
    .prepare("INSERT INTO reminders (vehicle_id, title, due_date, due_odometer, recurrence, renewal_type) VALUES (@vehicleId, @title, @dueDate, @dueOdometer, @recurrence, @renewalType)")
    .run({ renewalType: null, ...input });
}

export function upsertMotReminder(vehicleId: number, dueDate: string, motLabel = "MOT") {
  const title = `${motLabel} due`;
  const db = getDb();
  return db.transaction(() => {
    // Reuse the open reminder if there is one, otherwise reopen the most recent completed one,
    // so logging a new test resets the reminder instead of leaving a stale "done" entry behind.
    const existing = db
      .prepare("SELECT id FROM reminders WHERE vehicle_id = ? AND lower(title) = lower(?) ORDER BY completed_at IS NOT NULL, id DESC LIMIT 1")
      .get(vehicleId, title) as { id: number } | undefined;

    if (existing) {
      db.prepare("DELETE FROM reminders WHERE vehicle_id = ? AND lower(title) = lower(?) AND completed_at IS NOT NULL AND id != ?")
        .run(vehicleId, title, existing.id);
      return db
        .prepare("UPDATE reminders SET due_date = ?, due_odometer = NULL, recurrence = ?, completed_at = NULL WHERE id = ? AND vehicle_id = ?")
        .run(dueDate, "12 months", existing.id, vehicleId);
    }

    return createReminder({
      vehicleId,
      title,
      dueDate,
      dueOdometer: null,
      recurrence: "12 months"
    });
  })();
}

export function updateReminder(id: number, vehicleId: number, input: Omit<Reminder, "id" | "vehicleId" | "createdAt" | "renewalType">) {
  return getDb()
    .prepare("UPDATE reminders SET title = @title, due_date = @dueDate, due_odometer = @dueOdometer, recurrence = @recurrence, completed_at = @completedAt WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteReminder(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM reminders WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function completeReminder(id: number, vehicleId: number) {
  return getDb()
    .prepare("UPDATE reminders SET completed_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

// Completes a reminder from the reminders list. Recurring reminders are rolled forward to their
// next due date/mileage instead of being marked done; reminders owned by the Service Plan are
// left to the Service Plan, which creates the next one itself.
export function completeOrRepeatReminder(id: number, vehicleId: number, today = new Date().toISOString().slice(0, 10)) {
  const db = getDb();
  const reminder = db
    .prepare("SELECT recurrence, due_odometer as dueOdometer FROM reminders WHERE id = ? AND vehicle_id = ?")
    .get(id, vehicleId) as { recurrence: string | null; dueOdometer: number | null } | undefined;
  if (!reminder) return { changes: 0 };

  const linkedToServicePlan = db.prepare("SELECT 1 FROM vehicle_service_intervals WHERE reminder_id = ? AND vehicle_id = ?").get(id, vehicleId);
  const match = reminder.recurrence?.trim().match(/^(\d+)\s*(months?|miles?)$/i);
  if (linkedToServicePlan || !match) return completeReminder(id, vehicleId);

  const amount = Number(match[1]);
  if (match[2].toLowerCase().startsWith("month")) {
    return db
      .prepare("UPDATE reminders SET due_date = ?, due_odometer = NULL, completed_at = NULL WHERE id = ? AND vehicle_id = ?")
      .run(addMonths(today, amount), id, vehicleId);
  }

  const vehicle = getVehicle(vehicleId);
  const baseOdometer = vehicle?.effectiveOdometer ?? vehicle?.currentOdometer ?? reminder.dueOdometer;
  if (baseOdometer === null || baseOdometer === undefined) return completeReminder(id, vehicleId);
  return db
    .prepare("UPDATE reminders SET due_odometer = ?, due_date = NULL, completed_at = NULL WHERE id = ? AND vehicle_id = ?")
    .run(baseOdometer + amount, id, vehicleId);
}

// ─── Service intervals ──────────────────────────────────────────────────────

const serviceIntervalSelect = `
  id,
  name,
  interval_months as intervalMonths,
  interval_mileage as intervalMileage,
  created_at as createdAt,
  updated_at as updatedAt
`;

type ServiceIntervalInput = { name: string; intervalMonths: number | null; intervalMileage: number | null };

export function listServiceIntervals() {
  return getDb()
    .prepare(`SELECT ${serviceIntervalSelect} FROM service_intervals ORDER BY name COLLATE NOCASE ASC`)
    .all() as ServiceInterval[];
}

export function getServiceInterval(id: number) {
  return getDb()
    .prepare(`SELECT ${serviceIntervalSelect} FROM service_intervals WHERE id = ?`)
    .get(id) as ServiceInterval | undefined;
}

export function createServiceInterval(input: ServiceIntervalInput) {
  return getDb()
    .prepare("INSERT INTO service_intervals (name, interval_months, interval_mileage) VALUES (@name, @intervalMonths, @intervalMileage)")
    .run(input);
}

export function updateServiceInterval(id: number, input: ServiceIntervalInput) {
  return getDb()
    .prepare("UPDATE service_intervals SET name = @name, interval_months = @intervalMonths, interval_mileage = @intervalMileage, updated_at = CURRENT_TIMESTAMP WHERE id = @id")
    .run({ id, ...input });
}

export function deleteServiceInterval(id: number) {
  return getDb()
    .prepare("DELETE FROM service_intervals WHERE id = ?")
    .run(id);
}

export function listVehicleServiceIntervals(vehicleId: number) {
  return getDb()
    .prepare(`
      SELECT
        vsi.id,
        vsi.vehicle_id as vehicleId,
        vsi.service_interval_id as serviceIntervalId,
        vsi.last_service_date as lastServiceDate,
        vsi.last_service_odometer as lastServiceOdometer,
        vsi.reminder_id as reminderId,
        vsi.created_at as createdAt,
        vsi.updated_at as updatedAt,
        si.name,
        si.interval_months as intervalMonths,
        si.interval_mileage as intervalMileage
      FROM vehicle_service_intervals vsi
      JOIN service_intervals si ON si.id = vsi.service_interval_id
      WHERE vsi.vehicle_id = ?
      ORDER BY si.name COLLATE NOCASE ASC
    `)
    .all(vehicleId) as VehicleServiceInterval[];
}

export function assignServiceInterval(vehicleId: number, serviceIntervalId: number) {
  return getDb()
    .prepare("INSERT OR IGNORE INTO vehicle_service_intervals (vehicle_id, service_interval_id) VALUES (?, ?)")
    .run(vehicleId, serviceIntervalId);
}

export function removeVehicleServiceInterval(id: number, vehicleId: number) {
  return getDb().transaction(() => {
    const row = getDb()
      .prepare("SELECT reminder_id as reminderId FROM vehicle_service_intervals WHERE id = ? AND vehicle_id = ?")
      .get(id, vehicleId) as { reminderId: number | null } | undefined;
    if (!row) return;
    getDb()
      .prepare("DELETE FROM vehicle_service_intervals WHERE id = ? AND vehicle_id = ?")
      .run(id, vehicleId);
    if (row.reminderId) deleteReminder(row.reminderId, vehicleId);
  })();
}

export function recordServiceDone(
  id: number,
  vehicleId: number,
  input: { serviceDate: string; serviceOdometer: number | null; cost: number }
) {
  return getDb().transaction(() => {
    const row = getDb()
      .prepare(`
        SELECT vsi.reminder_id as reminderId,
               si.interval_months as intervalMonths,
               si.interval_mileage as intervalMileage,
               si.name
        FROM vehicle_service_intervals vsi
        JOIN service_intervals si ON si.id = vsi.service_interval_id
        WHERE vsi.id = ? AND vsi.vehicle_id = ?
      `)
      .get(id, vehicleId) as {
        reminderId: number | null;
        intervalMonths: number | null;
        intervalMileage: number | null;
        name: string;
      } | undefined;
    if (!row) return;

    createMaintenance({
      vehicleId,
      date: input.serviceDate,
      odometer: input.serviceOdometer,
      category: row.name,
      description: row.name,
      cost: input.cost,
      notes: null
    });

    // The service is now in the maintenance history, so replace the reminder rather than leaving a "done" copy behind.
    if (row.reminderId) deleteReminder(row.reminderId, vehicleId);

    getDb()
      .prepare(`
        UPDATE vehicle_service_intervals
        SET last_service_date = @serviceDate,
            last_service_odometer = @serviceOdometer,
            reminder_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id AND vehicle_id = @vehicleId
      `)
      .run({ id, vehicleId, ...input });

    const nextDueDate = row.intervalMonths && input.serviceDate
      ? addMonths(input.serviceDate, row.intervalMonths)
      : null;
    const nextDueOdometer = row.intervalMileage !== null && input.serviceOdometer !== null
      ? input.serviceOdometer + row.intervalMileage
      : null;

    if (!nextDueDate && nextDueOdometer === null) return;

    const recurrence = row.intervalMonths
      ? `${row.intervalMonths} months`
      : row.intervalMileage ? `${row.intervalMileage} miles` : null;

    const reminderResult = createReminder({
      vehicleId,
      title: row.name,
      dueDate: nextDueDate,
      dueOdometer: nextDueOdometer,
      recurrence
    });

    getDb()
      .prepare("UPDATE vehicle_service_intervals SET reminder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?")
      .run(reminderResult.lastInsertRowid, id, vehicleId);
  })();
}
