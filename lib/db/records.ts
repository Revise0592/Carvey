import { getDb } from "./connection";
import type { FuelRecord, MaintenanceRecord, MotRecord, RepairRecord } from "./types";

// ─── Maintenance ────────────────────────────────────────────────────────────

const maintenanceSelect = "id, vehicle_id as vehicleId, date, odometer, category, description, garage, workshop_id as workshopId, cost, notes, created_at as createdAt";

export type MaintenanceInput = Omit<MaintenanceRecord, "id" | "vehicleId" | "createdAt" | "garage" | "workshopId"> & Partial<Pick<MaintenanceRecord, "garage" | "workshopId">>;

export function listMaintenance(vehicleId: number) {
  return getDb()
    .prepare(`SELECT ${maintenanceSelect} FROM maintenance_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC`)
    .all(vehicleId) as MaintenanceRecord[];
}

export function createMaintenance(input: MaintenanceInput & { vehicleId: number }) {
  return getDb()
    .prepare("INSERT INTO maintenance_records (vehicle_id, date, odometer, category, description, garage, workshop_id, cost, notes) VALUES (@vehicleId, @date, @odometer, @category, @description, @garage, @workshopId, @cost, @notes)")
    .run({ garage: null, workshopId: null, ...input });
}

export function updateMaintenance(id: number, vehicleId: number, input: MaintenanceInput) {
  return getDb()
    .prepare("UPDATE maintenance_records SET date = @date, odometer = @odometer, category = @category, description = @description, garage = @garage, workshop_id = @workshopId, cost = @cost, notes = @notes WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ garage: null, workshopId: null, id, vehicleId, ...input });
}

export function deleteMaintenance(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM maintenance_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

// ─── Repairs ────────────────────────────────────────────────────────────────

export type RepairInput = Omit<RepairRecord, "id" | "vehicleId" | "createdAt">;

export function listRepairs(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, date, odometer, fault, garage, workshop_id as workshopId, cost, notes, created_at as createdAt FROM repair_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC")
    .all(vehicleId) as RepairRecord[];
}

export function createRepair(input: RepairInput & { vehicleId: number }) {
  return getDb()
    .prepare("INSERT INTO repair_records (vehicle_id, date, odometer, fault, garage, workshop_id, cost, notes) VALUES (@vehicleId, @date, @odometer, @fault, @garage, @workshopId, @cost, @notes)")
    .run(input);
}

export function updateRepair(id: number, vehicleId: number, input: RepairInput) {
  return getDb()
    .prepare("UPDATE repair_records SET date = @date, odometer = @odometer, fault = @fault, garage = @garage, workshop_id = @workshopId, cost = @cost, notes = @notes WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteRepair(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM repair_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

// ─── MOTs / annual tests ────────────────────────────────────────────────────

export type MotInput = Omit<MotRecord, "id" | "vehicleId" | "createdAt">;

export function listMots(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, test_date as testDate, expiry_date as expiryDate, odometer, result, advisories, cost, certificate_ref as certificateRef, created_at as createdAt FROM mot_records WHERE vehicle_id = ? ORDER BY expiry_date DESC, id DESC")
    .all(vehicleId) as MotRecord[];
}

export function createMot(input: MotInput & { vehicleId: number }) {
  return getDb()
    .prepare("INSERT INTO mot_records (vehicle_id, test_date, expiry_date, odometer, result, advisories, cost, certificate_ref) VALUES (@vehicleId, @testDate, @expiryDate, @odometer, @result, @advisories, @cost, @certificateRef)")
    .run(input);
}

export function updateMot(id: number, vehicleId: number, input: MotInput) {
  return getDb()
    .prepare("UPDATE mot_records SET test_date = @testDate, expiry_date = @expiryDate, odometer = @odometer, result = @result, advisories = @advisories, cost = @cost, certificate_ref = @certificateRef WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteMot(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM mot_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

// ─── Fuel ───────────────────────────────────────────────────────────────────

export type FuelInput = Omit<FuelRecord, "id" | "vehicleId" | "createdAt">;

const fuelSelect = `
  id,
  vehicle_id as vehicleId,
  date,
  odometer,
  volume_litres as volumeLitres,
  total_cost as totalCost,
  fuel_type as fuelType,
  full_tank as fullTank,
  station,
  notes,
  created_at as createdAt
`;

export function listFuelRecords(vehicleId: number): FuelRecord[] {
  return getDb()
    .prepare(`SELECT ${fuelSelect} FROM fuel_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC`)
    .all(vehicleId) as FuelRecord[];
}

export function getFuelRecord(id: number, vehicleId: number): FuelRecord | undefined {
  return getDb()
    .prepare(`SELECT ${fuelSelect} FROM fuel_records WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as FuelRecord | undefined;
}

export function createFuelRecord(input: FuelInput & { vehicleId: number }) {
  return getDb()
    .prepare(`INSERT INTO fuel_records (vehicle_id, date, odometer, volume_litres, total_cost, fuel_type, full_tank, station, notes)
              VALUES (@vehicleId, @date, @odometer, @volumeLitres, @totalCost, @fuelType, @fullTank, @station, @notes)`)
    .run(input);
}

export function updateFuelRecord(id: number, vehicleId: number, input: FuelInput) {
  return getDb()
    .prepare(`UPDATE fuel_records
              SET date = @date, odometer = @odometer, volume_litres = @volumeLitres, total_cost = @totalCost,
                  fuel_type = @fuelType, full_tank = @fullTank, station = @station, notes = @notes
              WHERE id = @id AND vehicle_id = @vehicleId`)
    .run({ id, vehicleId, ...input });
}

export function deleteFuelRecord(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM fuel_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function getVehicleFuelSpend(vehicleId: number): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(total_cost), 0) as total FROM fuel_records WHERE vehicle_id = ? AND total_cost IS NOT NULL")
    .get(vehicleId) as { total: number };
  return row.total;
}
