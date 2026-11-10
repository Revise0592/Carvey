import { getDb } from "./connection";
import { createMaintenance, createRepair, type MaintenanceInput, type RepairInput } from "./records";
import { completeReminder, createReminder, deleteReminder, updateReminder } from "./reminders";
import type { PlannedPurchase } from "./types";

type PlannedPurchaseInput = Omit<PlannedPurchase, "id" | "vehicleId" | "reminderId" | "actualCost" | "purchasedDate" | "convertedToType" | "convertedRecordId" | "convertedAt" | "createdAt" | "updatedAt">;

const plannedPurchaseSelect = `
  id,
  vehicle_id as vehicleId,
  item_name as itemName,
  quantity,
  estimated_cost as estimatedCost,
  actual_cost as actualCost,
  supplier,
  url,
  due_date as dueDate,
  due_odometer as dueOdometer,
  notes,
  reminder_id as reminderId,
  purchased_date as purchasedDate,
  converted_to_type as convertedToType,
  converted_record_id as convertedRecordId,
  converted_at as convertedAt,
  created_at as createdAt,
  updated_at as updatedAt
`;

export function listPlannedPurchases(vehicleId: number) {
  return getDb()
    .prepare(`
      SELECT ${plannedPurchaseSelect}
      FROM planned_purchases
      WHERE vehicle_id = ?
      ORDER BY purchased_date IS NOT NULL, due_date IS NULL, due_date ASC, due_odometer IS NULL, due_odometer ASC, id DESC
    `)
    .all(vehicleId) as PlannedPurchase[];
}

export function listActivePlannedPurchases(vehicleId: number) {
  return getDb()
    .prepare(`
      SELECT ${plannedPurchaseSelect}
      FROM planned_purchases
      WHERE vehicle_id = ? AND purchased_date IS NULL
      ORDER BY due_date IS NULL, due_date ASC, due_odometer IS NULL, due_odometer ASC, id DESC
    `)
    .all(vehicleId) as PlannedPurchase[];
}

export function getPlannedPurchase(id: number, vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${plannedPurchaseSelect} FROM planned_purchases WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as PlannedPurchase | undefined;
}

export function createPlannedPurchase(input: PlannedPurchaseInput & { vehicleId: number }) {
  const result = getDb()
    .prepare(`
      INSERT INTO planned_purchases (vehicle_id, item_name, quantity, estimated_cost, supplier, url, due_date, due_odometer, notes)
      VALUES (@vehicleId, @itemName, @quantity, @estimatedCost, @supplier, @url, @dueDate, @dueOdometer, @notes)
    `)
    .run(input);
  syncPlannedPurchaseReminder(Number(result.lastInsertRowid), input.vehicleId);
  return result;
}

export function updatePlannedPurchase(id: number, vehicleId: number, input: PlannedPurchaseInput) {
  const result = getDb()
    .prepare(`
      UPDATE planned_purchases
      SET item_name = @itemName,
          quantity = @quantity,
          estimated_cost = @estimatedCost,
          supplier = @supplier,
          url = @url,
          due_date = @dueDate,
          due_odometer = @dueOdometer,
          notes = @notes,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id AND vehicle_id = @vehicleId AND purchased_date IS NULL
    `)
    .run({ id, vehicleId, ...input });
  if (result.changes) syncPlannedPurchaseReminder(id, vehicleId);
  return result;
}

export function deletePlannedPurchase(id: number, vehicleId: number) {
  const plannedPurchase = getPlannedPurchase(id, vehicleId);
  if (plannedPurchase?.reminderId) deleteReminder(plannedPurchase.reminderId, vehicleId);
  return getDb()
    .prepare("DELETE FROM planned_purchases WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function markPlannedPurchaseBought(id: number, vehicleId: number, input: { purchasedDate: string; actualCost: number }) {
  const plannedPurchase = getPlannedPurchase(id, vehicleId);
  const result = getDb()
    .prepare(`
      UPDATE planned_purchases
      SET purchased_date = @purchasedDate,
          actual_cost = @actualCost,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id AND vehicle_id = @vehicleId
    `)
    .run({ id, vehicleId, ...input });
  if (plannedPurchase?.reminderId) completeReminder(plannedPurchase.reminderId, vehicleId);
  return result;
}

export function updatePlannedPurchasePurchasedDate(id: number, vehicleId: number, purchasedDate: string) {
  return getDb()
    .prepare(`
      UPDATE planned_purchases
      SET purchased_date = @purchasedDate,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
        AND vehicle_id = @vehicleId
        AND purchased_date IS NOT NULL
    `)
    .run({ id, vehicleId, purchasedDate });
}

function markConverted(id: number, vehicleId: number, type: "maintenance" | "repair", recordId: number) {
  getDb()
    .prepare(`
      UPDATE planned_purchases
      SET converted_to_type = @type,
          converted_record_id = @recordId,
          converted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
        AND vehicle_id = @vehicleId
        AND purchased_date IS NOT NULL
        AND converted_at IS NULL
    `)
    .run({ id, vehicleId, type, recordId });
}

export function convertPlannedPurchaseToMaintenance(id: number, vehicleId: number, input: MaintenanceInput) {
  return getDb().transaction(() => {
    const plannedPurchase = getPlannedPurchase(id, vehicleId);
    if (!plannedPurchase?.purchasedDate || plannedPurchase.convertedAt) return { changes: 0 };
    const result = createMaintenance({ vehicleId, ...input });
    markConverted(id, vehicleId, "maintenance", Number(result.lastInsertRowid));
    return result;
  })();
}

export function convertPlannedPurchaseToRepair(id: number, vehicleId: number, input: RepairInput) {
  return getDb().transaction(() => {
    const plannedPurchase = getPlannedPurchase(id, vehicleId);
    if (!plannedPurchase?.purchasedDate || plannedPurchase.convertedAt) return { changes: 0 };
    const result = createRepair({ vehicleId, ...input });
    markConverted(id, vehicleId, "repair", Number(result.lastInsertRowid));
    return result;
  })();
}

export function getVehicleActivePlannedPurchaseSummary(vehicleId: number) {
  return getDb()
    .prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(estimated_cost), 0) as estimatedTotal
      FROM planned_purchases
      WHERE vehicle_id = ? AND purchased_date IS NULL
    `)
    .get(vehicleId) as { count: number; estimatedTotal: number };
}

function syncPlannedPurchaseReminder(id: number, vehicleId: number) {
  const plannedPurchase = getPlannedPurchase(id, vehicleId);
  if (!plannedPurchase || plannedPurchase.purchasedDate) return;

  const hasDueTarget = Boolean(plannedPurchase.dueDate || plannedPurchase.dueOdometer !== null);
  if (!hasDueTarget) {
    if (plannedPurchase.reminderId) {
      deleteReminder(plannedPurchase.reminderId, vehicleId);
      getDb().prepare("UPDATE planned_purchases SET reminder_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?").run(id, vehicleId);
    }
    return;
  }

  const title = `Buy: ${plannedPurchase.itemName}`;
  if (plannedPurchase.reminderId) {
    const result = updateReminder(plannedPurchase.reminderId, vehicleId, {
      title,
      dueDate: plannedPurchase.dueDate,
      dueOdometer: plannedPurchase.dueOdometer,
      recurrence: null,
      completedAt: null
    });
    if (result.changes) return;
  }

  const result = createReminder({
    vehicleId,
    title,
    dueDate: plannedPurchase.dueDate,
    dueOdometer: plannedPurchase.dueOdometer,
    recurrence: null
  });
  getDb()
    .prepare("UPDATE planned_purchases SET reminder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?")
    .run(result.lastInsertRowid, id, vehicleId);
}
