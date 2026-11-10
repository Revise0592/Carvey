import { getDb } from "./connection";
import type { OdometerReading, Vehicle } from "./types";

type VehicleInput = {
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  notes: string | null;
};

/** Every dated odometer reading for a vehicle, from any record that carries one. */
const odometerReadingsUnion = `
  SELECT vehicle_id, date, odometer FROM maintenance_records WHERE odometer IS NOT NULL
  UNION ALL
  SELECT vehicle_id, date, odometer FROM repair_records WHERE odometer IS NOT NULL
  UNION ALL
  SELECT vehicle_id, test_date, odometer FROM mot_records WHERE odometer IS NOT NULL
  UNION ALL
  SELECT vehicle_id, date, odometer FROM fuel_records
`;

/** Correlated subquery for the highest recorded odometer; used against an outer `vehicles` row. */
export const latestRecordedOdometerSelect = `
  SELECT MAX(odo) FROM (
    SELECT MAX(odometer) as odo FROM maintenance_records WHERE vehicle_id = vehicles.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM repair_records WHERE vehicle_id = vehicles.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM mot_records WHERE vehicle_id = vehicles.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM fuel_records WHERE vehicle_id = vehicles.id
  )
`;

// The odometer subquery is evaluated once per row in the inner select and reused for both columns.
const vehicleSelectFrom = (where: string) => `
  SELECT id, make, model, year, registration, vin,
         effectiveOdometer as currentOdometer,
         purchasePrice, purchaseDate, photoPath, thumbnailPath, notes, debugDestroyed,
         archived, sold, effectiveOdometer, createdAt, updatedAt
  FROM (
    SELECT id, make, model, year, registration, vin,
           COALESCE((${latestRecordedOdometerSelect}), current_odometer) as effectiveOdometer,
           purchase_price as purchasePrice,
           purchase_date as purchaseDate,
           photo_path as photoPath,
           thumbnail_path as thumbnailPath,
           notes,
           debug_destroyed as debugDestroyed,
           archived,
           sold,
           created_at as createdAt,
           updated_at as updatedAt
    FROM vehicles
    ${where}
  )
`;

export function listVehicles() {
  return getDb()
    .prepare(`${vehicleSelectFrom("WHERE archived = 0")} ORDER BY updatedAt DESC`)
    .all() as Vehicle[];
}

export function getVehicle(id: number) {
  return getDb()
    .prepare(vehicleSelectFrom("WHERE id = ?"))
    .get(id) as Vehicle | undefined;
}

export function findVehicleByRegistration(registration: string) {
  return getDb()
    .prepare(vehicleSelectFrom("WHERE replace(upper(registration), ' ', '') = replace(upper(?), ' ', '')"))
    .get(registration) as Vehicle | undefined;
}

export function createVehicle(input: VehicleInput) {
  return getDb()
    .prepare(`
      INSERT INTO vehicles (make, model, year, registration, vin, current_odometer, purchase_price, purchase_date, notes)
      VALUES (@make, @model, @year, @registration, @vin, @currentOdometer, @purchasePrice, @purchaseDate, @notes)
    `)
    .run(input);
}

export function updateVehicle(id: number, input: VehicleInput & { sold: boolean }) {
  return getDb()
    .prepare(`
      UPDATE vehicles
      SET make = @make,
          model = @model,
          year = @year,
          registration = @registration,
          vin = @vin,
          current_odometer = @currentOdometer,
          purchase_price = @purchasePrice,
          purchase_date = @purchaseDate,
          notes = @notes,
          sold = @sold,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    .run({ id, ...input, sold: input.sold ? 1 : 0 });
}

export function deleteVehicle(id: number) {
  return getDb()
    .prepare("DELETE FROM vehicles WHERE id = ?")
    .run(id);
}

export function setVehiclePhoto(id: number, photoPath: string, thumbnailPath: string) {
  return getDb()
    .prepare("UPDATE vehicles SET photo_path = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(photoPath, thumbnailPath, id);
}

export function setVehicleDebugDestroyed(id: number, destroyed: boolean) {
  return getDb()
    .prepare("UPDATE vehicles SET debug_destroyed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(destroyed ? 1 : 0, id);
}

/**
 * Dated odometer readings, oldest first. The vehicle's own odometer field counts as a reading
 * on the day the vehicle was last edited, but only when it is ahead of every logged record.
 * Otherwise it is a starting value, or the latest record's reading saved back by the edit form.
 */
export function listOdometerReadings(vehicleId?: number): OdometerReading[] {
  const filter = vehicleId === undefined ? "" : "WHERE vehicle_id = @vehicleId";
  return getDb()
    .prepare(`
      SELECT vehicleId, date, odometer FROM (
        SELECT vehicle_id as vehicleId, substr(date, 1, 10) as date, odometer FROM (${odometerReadingsUnion}) ${filter}
        UNION ALL
        SELECT id, substr(updated_at, 1, 10), current_odometer FROM vehicles
        WHERE current_odometer IS NOT NULL
          ${vehicleId === undefined ? "" : "AND id = @vehicleId"}
          AND current_odometer > COALESCE((${latestRecordedOdometerSelect}), 0)
      )
      ORDER BY vehicleId, date, odometer
    `)
    .all(vehicleId === undefined ? {} : { vehicleId }) as OdometerReading[];
}
