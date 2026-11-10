import { renewalTypeLabels } from "../renewals";
import { getDb } from "./connection";
import { reminderSelect } from "./reminders";
import type { Reminder } from "./types";
import { latestRecordedOdometerSelect, listVehicles } from "./vehicles";

export type SpendType = "maintenance" | "repair" | "mot" | "fuel" | "parts" | "renewal";

export type SpendEntry = {
  type: SpendType;
  id: number;
  vehicleId: number;
  vehicleName: string;
  label: string;
  date: string;
  cost: number;
};

const renewalLabelSql = `CASE type ${Object.entries(renewalTypeLabels)
  .map(([type, label]) => `WHEN '${type}' THEN '${label}'`)
  .join(" ")} ELSE type END`;

/**
 * Every costed record as (type, id, vehicle_id, label, date, cost). The single source of truth for
 * spend, so vehicle totals, the yearly stat and the Costs page always agree.
 */
const spendUnion = `
  SELECT 'maintenance' as type, id, vehicle_id, description as label, date, cost FROM maintenance_records
  UNION ALL
  SELECT 'repair', id, vehicle_id, fault, date, cost FROM repair_records
  UNION ALL
  SELECT 'mot', id, vehicle_id, 'Test (' || result || ')', test_date, cost FROM mot_records
  UNION ALL
  SELECT 'fuel', id, vehicle_id, 'Fuel' || COALESCE(' · ' || station, ''), date, total_cost FROM fuel_records WHERE total_cost IS NOT NULL
  UNION ALL
  SELECT 'parts', id, vehicle_id, item_name, purchased_date, COALESCE(actual_cost, estimated_cost) FROM planned_purchases
    WHERE purchased_date IS NOT NULL AND converted_at IS NULL
  UNION ALL
  SELECT 'renewal', id, vehicle_id, ${renewalLabelSql} || COALESCE(' · ' || provider, ''), COALESCE(start_date, end_date), cost FROM renewals
`;

export function getVehicleLoggedSpend(vehicleId: number) {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(cost), 0) as total FROM (${spendUnion}) WHERE vehicle_id = ?`)
    .get(vehicleId) as { total: number };
  return row.total;
}

/** Every costed record across active vehicles, newest first. */
export function listSpendEntries() {
  return getDb()
    .prepare(`
      SELECT entries.type, entries.id, entries.vehicle_id as vehicleId, entries.label, entries.date, entries.cost,
             vehicles.make || ' ' || vehicles.model as vehicleName
      FROM (${spendUnion}) entries
      JOIN vehicles ON vehicles.id = entries.vehicle_id
      WHERE vehicles.archived = 0
      ORDER BY entries.date DESC, entries.id DESC
    `)
    .all() as SpendEntry[];
}

export type OpenReminder = Reminder & {
  make: string;
  model: string;
  registration: string;
  currentOdometer: number | null;
};

export function listOpenReminders() {
  return getDb()
    .prepare(`
      SELECT ${reminderSelect},
             make,
             model,
             registration,
             COALESCE((${latestRecordedOdometerSelect}), vehicles.current_odometer) as currentOdometer
      FROM reminders
      JOIN vehicles ON vehicles.id = reminders.vehicle_id
      WHERE completed_at IS NULL AND vehicles.archived = 0 AND vehicles.sold = 0
      ORDER BY due_date IS NULL, due_date ASC, due_odometer ASC
    `)
    .all() as OpenReminder[];
}

export type MotExpiry = { vehicleId: number; make: string; model: string; registration: string; expiryDate: string };

export function listLatestMotExpiries() {
  return getDb()
    .prepare(`
      SELECT vehicles.id as vehicleId, make, model, registration, latest.expiryDate
      FROM (
        SELECT vehicle_id, MAX(expiry_date) as expiryDate
        FROM mot_records
        GROUP BY vehicle_id
      ) latest
      JOIN vehicles ON vehicles.id = latest.vehicle_id
      WHERE vehicles.archived = 0 AND vehicles.sold = 0
      ORDER BY latest.expiryDate ASC
    `)
    .all() as MotExpiry[];
}

export function getDashboardStats() {
  const db = getDb();
  const vehicles = listVehicles();
  const yearlySpend = db
    .prepare(`SELECT COALESCE(SUM(cost), 0) as total FROM (${spendUnion}) WHERE date >= date('now', 'start of year')`)
    .get() as { total: number };
  const upcomingMots = db
    .prepare(`
      SELECT vehicles.id as vehicleId, make, model, registration, latest.expiryDate
      FROM (
        SELECT vehicle_id, MAX(expiry_date) as expiryDate
        FROM mot_records
        GROUP BY vehicle_id
      ) latest
      JOIN vehicles ON vehicles.id = latest.vehicle_id
      WHERE vehicles.archived = 0 AND latest.expiryDate <= date('now', '+45 days')
      ORDER BY latest.expiryDate ASC
      LIMIT 6
    `)
    .all() as MotExpiry[];
  const plannedPurchases = db
    .prepare(`
      SELECT planned_purchases.id,
             vehicle_id as vehicleId,
             item_name as itemName,
             quantity,
             estimated_cost as estimatedCost,
             due_date as dueDate,
             due_odometer as dueOdometer,
             make,
             model
      FROM planned_purchases
      JOIN vehicles ON vehicles.id = planned_purchases.vehicle_id
      WHERE purchased_date IS NULL AND vehicles.archived = 0
      ORDER BY due_date IS NULL, due_date ASC, due_odometer IS NULL, due_odometer ASC, planned_purchases.id DESC
      LIMIT 8
    `)
    .all() as Array<{ id: number; vehicleId: number; itemName: string; quantity: number; estimatedCost: number; dueDate: string | null; dueOdometer: number | null; make: string; model: string }>;
  const plannedPurchaseCount = db
    .prepare(`
      SELECT COUNT(*) as count
      FROM planned_purchases
      JOIN vehicles ON vehicles.id = planned_purchases.vehicle_id
      WHERE purchased_date IS NULL AND vehicles.archived = 0
    `)
    .get() as { count: number };
  return {
    vehicles,
    yearlySpend: yearlySpend.total,
    upcomingMots,
    plannedPurchases,
    plannedPurchaseCount: plannedPurchaseCount.count
  };
}
