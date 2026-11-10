import { renewalReminderTitle } from "../renewals";
import { getDb } from "./connection";
import { createReminder } from "./reminders";
import type { Renewal, RenewalType } from "./types";

export type RenewalInput = Omit<Renewal, "id" | "vehicleId" | "createdAt" | "updatedAt">;

const renewalColumns = (t: string) => `
  ${t}.id,
  ${t}.vehicle_id as vehicleId,
  ${t}.type,
  ${t}.provider,
  ${t}.reference,
  ${t}.start_date as startDate,
  ${t}.end_date as endDate,
  ${t}.cost,
  ${t}.notes,
  ${t}.created_at as createdAt,
  ${t}.updated_at as updatedAt
`;
const renewalSelect = renewalColumns("renewals");

export function listRenewals(vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${renewalSelect} FROM renewals WHERE vehicle_id = ? ORDER BY end_date DESC, id DESC`)
    .all(vehicleId) as Renewal[];
}

export function getRenewal(id: number, vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${renewalSelect} FROM renewals WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as Renewal | undefined;
}

export function createRenewal(input: RenewalInput & { vehicleId: number }) {
  return getDb().transaction(() => {
    const result = getDb()
      .prepare(`
        INSERT INTO renewals (vehicle_id, type, provider, reference, start_date, end_date, cost, notes)
        VALUES (@vehicleId, @type, @provider, @reference, @startDate, @endDate, @cost, @notes)
      `)
      .run(input);
    syncRenewalReminder(input.vehicleId, input.type);
    return result;
  })();
}

export function updateRenewal(id: number, vehicleId: number, input: RenewalInput) {
  return getDb().transaction(() => {
    const previous = getRenewal(id, vehicleId);
    const result = getDb()
      .prepare(`
        UPDATE renewals
        SET type = @type, provider = @provider, reference = @reference, start_date = @startDate,
            end_date = @endDate, cost = @cost, notes = @notes, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id AND vehicle_id = @vehicleId
      `)
      .run({ id, vehicleId, ...input });
    syncRenewalReminder(vehicleId, input.type);
    if (previous && previous.type !== input.type) syncRenewalReminder(vehicleId, previous.type);
    return result;
  })();
}

export function deleteRenewal(id: number, vehicleId: number) {
  return getDb().transaction(() => {
    const previous = getRenewal(id, vehicleId);
    const result = getDb().prepare("DELETE FROM renewals WHERE id = ? AND vehicle_id = ?").run(id, vehicleId);
    if (previous) syncRenewalReminder(vehicleId, previous.type);
    return result;
  })();
}

/**
 * Keeps one reminder per vehicle and renewal type, due on the latest policy's end date.
 * A reminder the user dismissed stays dismissed unless the due date moves.
 */
export function syncRenewalReminder(vehicleId: number, type: RenewalType) {
  const db = getDb();
  const latest = db
    .prepare("SELECT end_date as endDate FROM renewals WHERE vehicle_id = ? AND type = ? ORDER BY end_date DESC, id DESC LIMIT 1")
    .get(vehicleId, type) as { endDate: string } | undefined;
  const existing = db
    .prepare("SELECT id FROM reminders WHERE vehicle_id = ? AND renewal_type = ? ORDER BY completed_at IS NOT NULL, id DESC")
    .all(vehicleId, type) as Array<{ id: number }>;

  if (!latest) {
    db.prepare("DELETE FROM reminders WHERE vehicle_id = ? AND renewal_type = ?").run(vehicleId, type);
    return;
  }

  const [keep, ...extra] = existing;
  for (const row of extra) db.prepare("DELETE FROM reminders WHERE id = ?").run(row.id);

  if (keep) {
    db.prepare(`
      UPDATE reminders
      SET title = @title,
          completed_at = CASE WHEN due_date = @dueDate THEN completed_at ELSE NULL END,
          due_date = @dueDate,
          due_odometer = NULL,
          recurrence = NULL
      WHERE id = @id
    `).run({ id: keep.id, title: renewalReminderTitle(type), dueDate: latest.endDate });
    return;
  }

  createReminder({
    vehicleId,
    title: renewalReminderTitle(type),
    dueDate: latest.endDate,
    dueOdometer: null,
    recurrence: null,
    renewalType: type
  });
}

export type CurrentRenewal = Renewal & { make: string; model: string; registration: string };

/** The latest renewal of each type per active vehicle, soonest end date first. */
export function listCurrentRenewals() {
  return getDb()
    .prepare(`
      SELECT ${renewalSelect}, make, model, registration
      FROM renewals
      JOIN vehicles ON vehicles.id = renewals.vehicle_id
      WHERE vehicles.archived = 0 AND vehicles.sold = 0
        AND renewals.id = (
          SELECT r2.id FROM renewals r2
          WHERE r2.vehicle_id = renewals.vehicle_id AND r2.type = renewals.type
          ORDER BY r2.end_date DESC, r2.id DESC LIMIT 1
        )
      ORDER BY renewals.end_date ASC
    `)
    .all() as CurrentRenewal[];
}
