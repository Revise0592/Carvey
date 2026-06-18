import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Vehicle = {
  id: number;
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  photoPath: string | null;
  thumbnailPath: string | null;
  notes: string | null;
  debugDestroyed: number;
  archived: number;
  sold: number;
  effectiveOdometer: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenanceRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  category: string;
  description: string;
  cost: number;
  notes: string | null;
  createdAt: string;
};

export type MaintenanceCategory = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RepairRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  fault: string;
  garage: string | null;
  workshopId: number | null;
  cost: number;
  notes: string | null;
  createdAt: string;
};

export type MotRecord = {
  id: number;
  vehicleId: number;
  testDate: string;
  expiryDate: string;
  odometer: number | null;
  result: "pass" | "fail" | "advisory";
  advisories: string | null;
  cost: number;
  certificateRef: string | null;
  createdAt: string;
};

export type Reminder = {
  id: number;
  vehicleId: number;
  title: string;
  dueDate: string | null;
  dueOdometer: number | null;
  recurrence: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type PlannedPurchase = {
  id: number;
  vehicleId: number;
  itemName: string;
  quantity: number;
  estimatedCost: number;
  actualCost: number | null;
  supplier: string | null;
  url: string | null;
  dueDate: string | null;
  dueOdometer: number | null;
  notes: string | null;
  reminderId: number | null;
  purchasedDate: string | null;
  convertedToType: "maintenance" | "repair" | null;
  convertedRecordId: number | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecordAttachment = {
  id: number;
  recordType: "maintenance" | "repair" | "mot";
  recordId: number;
  vehicleId: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  createdAt: string;
};

export type Workshop = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: number;
  createdAt: string;
  updatedAt: string;
};

export type ServiceInterval = {
  id: number;
  name: string;
  intervalMonths: number | null;
  intervalMileage: number | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleServiceInterval = {
  id: number;
  vehicleId: number;
  serviceIntervalId: number;
  lastServiceDate: string | null;
  lastServiceOdometer: number | null;
  reminderId: number | null;
  createdAt: string;
  updatedAt: string;
  name: string;
  intervalMonths: number | null;
  intervalMileage: number | null;
};

export const defaultCollectionName = "My cars";

// ─── Singleton ───────────────────────────────────────────────────────────────

let dbInstance: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await openDatabaseAsync("carvey.db");
    await dbInstance.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    await migrate(dbInstance);
  }
  return dbInstance;
}

export async function closeDb() {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// ─── Schema ──────────────────────────────────────────────────────────────────

async function migrate(database: SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workshops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      notes TEXT,
      preferred INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      registration TEXT NOT NULL,
      vin TEXT,
      current_odometer INTEGER,
      purchase_price REAL,
      purchase_date TEXT,
      photo_path TEXT,
      thumbnail_path TEXT,
      notes TEXT,
      debug_destroyed INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      sold INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      odometer INTEGER,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS repair_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      odometer INTEGER,
      fault TEXT NOT NULL,
      garage TEXT,
      workshop_id INTEGER REFERENCES workshops(id) ON DELETE SET NULL,
      cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mot_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      test_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      odometer INTEGER,
      result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'advisory')),
      advisories TEXT,
      cost REAL NOT NULL DEFAULT 0,
      certificate_ref TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      due_date TEXT,
      due_odometer INTEGER,
      recurrence TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS planned_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      estimated_cost REAL NOT NULL DEFAULT 0,
      actual_cost REAL,
      supplier TEXT,
      url TEXT,
      due_date TEXT,
      due_odometer INTEGER,
      notes TEXT,
      reminder_id INTEGER REFERENCES reminders(id) ON DELETE SET NULL,
      purchased_date TEXT,
      converted_to_type TEXT CHECK (converted_to_type IN ('maintenance', 'repair')),
      converted_record_id INTEGER,
      converted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS record_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_type TEXT NOT NULL CHECK (record_type IN ('maintenance', 'repair', 'mot')),
      record_id INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS service_intervals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      interval_months INTEGER,
      interval_mileage INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicle_service_intervals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      service_interval_id INTEGER NOT NULL REFERENCES service_intervals(id) ON DELETE CASCADE,
      last_service_date TEXT,
      last_service_odometer INTEGER,
      reminder_id INTEGER REFERENCES reminders(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(vehicle_id, service_interval_id)
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_archived ON vehicles(archived);
    CREATE INDEX IF NOT EXISTS idx_workshops_preferred ON workshops(preferred);
    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repair_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_mot_vehicle ON mot_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_planned_purchases_vehicle ON planned_purchases(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_record ON record_attachments(record_type, record_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_vehicle ON record_attachments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vehicle_service_intervals_vehicle ON vehicle_service_intervals(vehicle_id);
  `);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    key
  );
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    value
  );
}

export async function getCollectionName(): Promise<string> {
  return (await getAppSetting("collectionName")) ?? defaultCollectionName;
}

export async function updateCollectionName(name: string): Promise<void> {
  await setAppSetting("collectionName", name);
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

const latestOdometerSubquery = `
  SELECT MAX(odo) FROM (
    SELECT MAX(odometer) as odo FROM maintenance_records WHERE vehicle_id = v.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM repair_records WHERE vehicle_id = v.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM mot_records WHERE vehicle_id = v.id
  )
`;

const vehicleSelect = `
  v.id,
  v.make,
  v.model,
  v.year,
  v.registration,
  v.vin,
  COALESCE((${latestOdometerSubquery}), v.current_odometer) as currentOdometer,
  v.purchase_price as purchasePrice,
  v.purchase_date as purchaseDate,
  v.photo_path as photoPath,
  v.thumbnail_path as thumbnailPath,
  v.notes,
  v.debug_destroyed as debugDestroyed,
  v.archived,
  v.sold,
  COALESCE((${latestOdometerSubquery}), v.current_odometer) as effectiveOdometer,
  v.created_at as createdAt,
  v.updated_at as updatedAt
`;

export async function listVehicles(): Promise<Vehicle[]> {
  const db = await getDb();
  return db.getAllAsync<Vehicle>(
    `SELECT ${vehicleSelect} FROM vehicles v WHERE v.archived = 0 ORDER BY v.updated_at DESC`
  );
}

export async function listArchivedVehicles(): Promise<Vehicle[]> {
  const db = await getDb();
  return db.getAllAsync<Vehicle>(
    `SELECT ${vehicleSelect} FROM vehicles v WHERE v.archived = 1 ORDER BY v.updated_at DESC`
  );
}

export async function getVehicle(id: number): Promise<Vehicle | null> {
  const db = await getDb();
  return db.getFirstAsync<Vehicle>(
    `SELECT ${vehicleSelect} FROM vehicles v WHERE v.id = ?`,
    id
  );
}

export async function createVehicle(input: {
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  notes: string | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO vehicles (make, model, year, registration, vin, current_odometer, purchase_price, purchase_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.make,
    input.model,
    input.year,
    input.registration,
    input.vin,
    input.currentOdometer,
    input.purchasePrice,
    input.purchaseDate,
    input.notes
  );
  return result.lastInsertRowId;
}

export async function updateVehicle(
  id: number,
  input: {
    make: string;
    model: string;
    year: number | null;
    registration: string;
    vin: string | null;
    currentOdometer: number | null;
    purchasePrice: number | null;
    purchaseDate: string | null;
    notes: string | null;
    sold: boolean;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE vehicles
     SET make = ?, model = ?, year = ?, registration = ?, vin = ?,
         current_odometer = ?, purchase_price = ?, purchase_date = ?,
         notes = ?, sold = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    input.make,
    input.model,
    input.year,
    input.registration,
    input.vin,
    input.currentOdometer,
    input.purchasePrice,
    input.purchaseDate,
    input.notes,
    input.sold ? 1 : 0,
    id
  );
}

export async function archiveVehicle(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE vehicles SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    id
  );
}

export async function deleteVehicle(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM vehicles WHERE id = ?", id);
}

export async function setVehiclePhoto(
  id: number,
  photoPath: string,
  thumbnailPath: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE vehicles SET photo_path = ?, thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    photoPath,
    thumbnailPath,
    id
  );
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export async function listMaintenance(vehicleId: number): Promise<MaintenanceRecord[]> {
  const db = await getDb();
  return db.getAllAsync<MaintenanceRecord>(
    `SELECT id, vehicle_id as vehicleId, date, odometer, category, description, cost, notes, created_at as createdAt
     FROM maintenance_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC`,
    vehicleId
  );
}

export async function getMaintenance(id: number, vehicleId: number): Promise<MaintenanceRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<MaintenanceRecord>(
    `SELECT id, vehicle_id as vehicleId, date, odometer, category, description, cost, notes, created_at as createdAt
     FROM maintenance_records WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId
  );
}

export async function createMaintenance(
  input: Omit<MaintenanceRecord, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO maintenance_records (vehicle_id, date, odometer, category, description, cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.date,
    input.odometer,
    input.category,
    input.description,
    input.cost,
    input.notes
  );
  return result.lastInsertRowId;
}

export async function updateMaintenance(
  id: number,
  vehicleId: number,
  input: Omit<MaintenanceRecord, "id" | "vehicleId" | "createdAt">
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE maintenance_records
     SET date = ?, odometer = ?, category = ?, description = ?, cost = ?, notes = ?
     WHERE id = ? AND vehicle_id = ?`,
    input.date,
    input.odometer,
    input.category,
    input.description,
    input.cost,
    input.notes,
    id,
    vehicleId
  );
}

export async function deleteMaintenance(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM maintenance_records WHERE id = ? AND vehicle_id = ?", id, vehicleId);
}

// ─── Repairs ─────────────────────────────────────────────────────────────────

export async function listRepairs(vehicleId: number): Promise<RepairRecord[]> {
  const db = await getDb();
  return db.getAllAsync<RepairRecord>(
    `SELECT id, vehicle_id as vehicleId, date, odometer, fault, garage, workshop_id as workshopId, cost, notes, created_at as createdAt
     FROM repair_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC`,
    vehicleId
  );
}

export async function getRepair(id: number, vehicleId: number): Promise<RepairRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<RepairRecord>(
    `SELECT id, vehicle_id as vehicleId, date, odometer, fault, garage, workshop_id as workshopId, cost, notes, created_at as createdAt
     FROM repair_records WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId
  );
}

export async function createRepair(
  input: Omit<RepairRecord, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO repair_records (vehicle_id, date, odometer, fault, garage, workshop_id, cost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.date,
    input.odometer,
    input.fault,
    input.garage,
    input.workshopId,
    input.cost,
    input.notes
  );
  return result.lastInsertRowId;
}

export async function updateRepair(
  id: number,
  vehicleId: number,
  input: Omit<RepairRecord, "id" | "vehicleId" | "createdAt">
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE repair_records
     SET date = ?, odometer = ?, fault = ?, garage = ?, workshop_id = ?, cost = ?, notes = ?
     WHERE id = ? AND vehicle_id = ?`,
    input.date,
    input.odometer,
    input.fault,
    input.garage,
    input.workshopId,
    input.cost,
    input.notes,
    id,
    vehicleId
  );
}

export async function deleteRepair(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM repair_records WHERE id = ? AND vehicle_id = ?", id, vehicleId);
}

// ─── MOT / Emissions ─────────────────────────────────────────────────────────

export async function listMots(vehicleId: number): Promise<MotRecord[]> {
  const db = await getDb();
  return db.getAllAsync<MotRecord>(
    `SELECT id, vehicle_id as vehicleId, test_date as testDate, expiry_date as expiryDate,
            odometer, result, advisories, cost, certificate_ref as certificateRef, created_at as createdAt
     FROM mot_records WHERE vehicle_id = ? ORDER BY expiry_date DESC, id DESC`,
    vehicleId
  );
}

export async function getMot(id: number, vehicleId: number): Promise<MotRecord | null> {
  const db = await getDb();
  return db.getFirstAsync<MotRecord>(
    `SELECT id, vehicle_id as vehicleId, test_date as testDate, expiry_date as expiryDate,
            odometer, result, advisories, cost, certificate_ref as certificateRef, created_at as createdAt
     FROM mot_records WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId
  );
}

export async function createMot(
  input: Omit<MotRecord, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO mot_records (vehicle_id, test_date, expiry_date, odometer, result, advisories, cost, certificate_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.testDate,
    input.expiryDate,
    input.odometer,
    input.result,
    input.advisories,
    input.cost,
    input.certificateRef
  );
  return result.lastInsertRowId;
}

export async function updateMot(
  id: number,
  vehicleId: number,
  input: Omit<MotRecord, "id" | "vehicleId" | "createdAt">
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE mot_records
     SET test_date = ?, expiry_date = ?, odometer = ?, result = ?, advisories = ?, cost = ?, certificate_ref = ?
     WHERE id = ? AND vehicle_id = ?`,
    input.testDate,
    input.expiryDate,
    input.odometer,
    input.result,
    input.advisories,
    input.cost,
    input.certificateRef,
    id,
    vehicleId
  );
}

export async function deleteMot(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM mot_records WHERE id = ? AND vehicle_id = ?", id, vehicleId);
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function listReminders(vehicleId: number): Promise<Reminder[]> {
  const db = await getDb();
  return db.getAllAsync<Reminder>(
    `SELECT id, vehicle_id as vehicleId, title, due_date as dueDate, due_odometer as dueOdometer,
            recurrence, completed_at as completedAt, created_at as createdAt
     FROM reminders WHERE vehicle_id = ?
     ORDER BY completed_at ASC, due_date ASC, due_odometer ASC`,
    vehicleId
  );
}

export async function getReminder(id: number, vehicleId: number): Promise<Reminder | null> {
  const db = await getDb();
  return db.getFirstAsync<Reminder>(
    `SELECT id, vehicle_id as vehicleId, title, due_date as dueDate, due_odometer as dueOdometer,
            recurrence, completed_at as completedAt, created_at as createdAt
     FROM reminders WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId
  );
}

export async function createReminder(
  input: Omit<Reminder, "id" | "createdAt" | "completedAt">
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO reminders (vehicle_id, title, due_date, due_odometer, recurrence)
     VALUES (?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.title,
    input.dueDate,
    input.dueOdometer,
    input.recurrence
  );
  return result.lastInsertRowId;
}

export async function updateReminder(
  id: number,
  vehicleId: number,
  input: Omit<Reminder, "id" | "vehicleId" | "createdAt">
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE reminders
     SET title = ?, due_date = ?, due_odometer = ?, recurrence = ?, completed_at = ?
     WHERE id = ? AND vehicle_id = ?`,
    input.title,
    input.dueDate,
    input.dueOdometer,
    input.recurrence,
    input.completedAt,
    id,
    vehicleId
  );
}

export async function completeReminder(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE reminders SET completed_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?",
    id,
    vehicleId
  );
}

export async function deleteReminder(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM reminders WHERE id = ? AND vehicle_id = ?", id, vehicleId);
}

export async function upsertMotReminder(vehicleId: number, dueDate: string): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM reminders WHERE vehicle_id = ? AND title = ? AND completed_at IS NULL ORDER BY id DESC LIMIT 1",
    vehicleId,
    "MOT due"
  );
  if (existing) {
    await db.runAsync(
      "UPDATE reminders SET due_date = ?, due_odometer = NULL, recurrence = ? WHERE id = ? AND vehicle_id = ?",
      dueDate,
      "12 months",
      existing.id,
      vehicleId
    );
  } else {
    await createReminder({
      vehicleId,
      title: "MOT due",
      dueDate,
      dueOdometer: null,
      recurrence: "12 months",
    });
  }
}

// ─── Planned Purchases ───────────────────────────────────────────────────────

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

export async function listPlannedPurchases(vehicleId: number): Promise<PlannedPurchase[]> {
  const db = await getDb();
  return db.getAllAsync<PlannedPurchase>(
    `SELECT ${plannedPurchaseSelect}
     FROM planned_purchases
     WHERE vehicle_id = ?
     ORDER BY purchased_date IS NOT NULL, due_date IS NULL, due_date ASC, id DESC`,
    vehicleId
  );
}

export async function listActivePlannedPurchases(vehicleId: number): Promise<PlannedPurchase[]> {
  const db = await getDb();
  return db.getAllAsync<PlannedPurchase>(
    `SELECT ${plannedPurchaseSelect}
     FROM planned_purchases
     WHERE vehicle_id = ? AND purchased_date IS NULL
     ORDER BY due_date IS NULL, due_date ASC, id DESC`,
    vehicleId
  );
}

export async function getPlannedPurchase(
  id: number,
  vehicleId: number
): Promise<PlannedPurchase | null> {
  const db = await getDb();
  return db.getFirstAsync<PlannedPurchase>(
    `SELECT ${plannedPurchaseSelect} FROM planned_purchases WHERE id = ? AND vehicle_id = ?`,
    id,
    vehicleId
  );
}

export async function createPlannedPurchase(
  input: Omit<PlannedPurchase, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO planned_purchases
     (vehicle_id, item_name, quantity, estimated_cost, actual_cost, supplier, url,
      due_date, due_odometer, notes, reminder_id, purchased_date,
      converted_to_type, converted_record_id, converted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.vehicleId,
    input.itemName,
    input.quantity,
    input.estimatedCost,
    input.actualCost,
    input.supplier,
    input.url,
    input.dueDate,
    input.dueOdometer,
    input.notes,
    input.reminderId,
    input.purchasedDate,
    input.convertedToType,
    input.convertedRecordId,
    input.convertedAt
  );
  return result.lastInsertRowId;
}

export async function updatePlannedPurchase(
  id: number,
  vehicleId: number,
  input: Partial<Omit<PlannedPurchase, "id" | "vehicleId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = await getDb();
  const fields = Object.entries(input)
    .map(([key]) => {
      const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      return `${col} = ?`;
    })
    .join(", ");
  const values = Object.values(input);
  await db.runAsync(
    `UPDATE planned_purchases SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND vehicle_id = ?`,
    ...values,
    id,
    vehicleId
  );
}

export async function deletePlannedPurchase(id: number, vehicleId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM planned_purchases WHERE id = ? AND vehicle_id = ?", id, vehicleId);
}

// ─── Workshops ───────────────────────────────────────────────────────────────

export async function listWorkshops(): Promise<Workshop[]> {
  const db = await getDb();
  return db.getAllAsync<Workshop>(
    `SELECT id, name, address, phone, email, website, notes, preferred,
            created_at as createdAt, updated_at as updatedAt
     FROM workshops ORDER BY preferred DESC, name COLLATE NOCASE ASC`
  );
}

export async function getWorkshop(id: number): Promise<Workshop | null> {
  const db = await getDb();
  return db.getFirstAsync<Workshop>(
    `SELECT id, name, address, phone, email, website, notes, preferred,
            created_at as createdAt, updated_at as updatedAt
     FROM workshops WHERE id = ?`,
    id
  );
}

export async function createWorkshop(input: {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: boolean;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO workshops (name, address, phone, email, website, notes, preferred)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.address,
    input.phone,
    input.email,
    input.website,
    input.notes,
    input.preferred ? 1 : 0
  );
  return result.lastInsertRowId;
}

export async function updateWorkshop(
  id: number,
  input: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    notes: string | null;
    preferred: boolean;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE workshops
     SET name = ?, address = ?, phone = ?, email = ?, website = ?, notes = ?, preferred = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    input.name,
    input.address,
    input.phone,
    input.email,
    input.website,
    input.notes,
    input.preferred ? 1 : 0,
    id
  );
}

export async function deleteWorkshop(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM workshops WHERE id = ?", id);
}

export async function getOrCreateWorkshopByName(name: string): Promise<Workshop> {
  const db = await getDb();
  const normalized = name.trim().replace(/\s+/g, " ");
  const existing = await db.getFirstAsync<Workshop>(
    `SELECT id, name, address, phone, email, website, notes, preferred,
            created_at as createdAt, updated_at as updatedAt
     FROM workshops WHERE lower(name) = lower(?)`,
    normalized
  );
  if (existing) return existing;
  const id = await createWorkshop({
    name: normalized,
    address: null,
    phone: null,
    email: null,
    website: null,
    notes: null,
    preferred: false,
  });
  return (await getWorkshop(id))!;
}

// ─── Maintenance Categories ───────────────────────────────────────────────────

export async function listMaintenanceCategories(): Promise<MaintenanceCategory[]> {
  const db = await getDb();
  return db.getAllAsync<MaintenanceCategory>(
    "SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM maintenance_categories ORDER BY name COLLATE NOCASE ASC"
  );
}

export async function createMaintenanceCategory(name: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO maintenance_categories (name) VALUES (?)",
    name
  );
  return result.lastInsertRowId;
}

export async function updateMaintenanceCategory(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE maintenance_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    name,
    id
  );
}

export async function deleteMaintenanceCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM maintenance_categories WHERE id = ?", id);
}

export type ReminderWithVehicle = Reminder & {
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistration: string;
};

export async function listAllOpenReminders(): Promise<ReminderWithVehicle[]> {
  const db = await getDb();
  return db.getAllAsync<ReminderWithVehicle>(
    `SELECT r.id, r.vehicle_id as vehicleId, r.title, r.due_date as dueDate,
            r.due_odometer as dueOdometer, r.recurrence, r.completed_at as completedAt,
            r.created_at as createdAt,
            v.make as vehicleMake, v.model as vehicleModel, v.registration as vehicleRegistration
     FROM reminders r
     JOIN vehicles v ON r.vehicle_id = v.id
     WHERE r.completed_at IS NULL AND v.archived = 0 AND v.sold = 0
     ORDER BY r.due_date IS NULL, r.due_date ASC, r.id ASC`
  );
}

// ─── Service Intervals ───────────────────────────────────────────────────────

export async function listServiceIntervals(): Promise<ServiceInterval[]> {
  const db = await getDb();
  return db.getAllAsync<ServiceInterval>(
    `SELECT id, name, interval_months as intervalMonths, interval_mileage as intervalMileage,
            created_at as createdAt, updated_at as updatedAt
     FROM service_intervals ORDER BY name COLLATE NOCASE ASC`
  );
}

export async function createServiceInterval(input: {
  name: string;
  intervalMonths: number | null;
  intervalMileage: number | null;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO service_intervals (name, interval_months, interval_mileage) VALUES (?, ?, ?)",
    input.name,
    input.intervalMonths,
    input.intervalMileage
  );
  return result.lastInsertRowId;
}

export async function updateServiceInterval(
  id: number,
  input: { name: string; intervalMonths: number | null; intervalMileage: number | null }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE service_intervals SET name = ?, interval_months = ?, interval_mileage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    input.name,
    input.intervalMonths,
    input.intervalMileage,
    id
  );
}

export async function deleteServiceInterval(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM service_intervals WHERE id = ?", id);
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function listAttachments(
  recordType: "maintenance" | "repair" | "mot",
  recordId: number
): Promise<RecordAttachment[]> {
  const db = await getDb();
  return db.getAllAsync<RecordAttachment>(
    `SELECT id, record_type as recordType, record_id as recordId, vehicle_id as vehicleId,
            filename, original_filename as originalFilename, mime_type as mimeType,
            file_size as fileSize, file_path as filePath, created_at as createdAt
     FROM record_attachments WHERE record_type = ? AND record_id = ?`,
    recordType,
    recordId
  );
}

export async function createAttachment(input: Omit<RecordAttachment, "id" | "createdAt">): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO record_attachments
     (record_type, record_id, vehicle_id, filename, original_filename, mime_type, file_size, file_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    input.recordType,
    input.recordId,
    input.vehicleId,
    input.filename,
    input.originalFilename,
    input.mimeType,
    input.fileSize,
    input.filePath
  );
  return result.lastInsertRowId;
}

export async function deleteAttachment(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM record_attachments WHERE id = ?", id);
}

// ─── Dashboard Aggregates ────────────────────────────────────────────────────

export async function getYearlySpend(): Promise<number> {
  const db = await getDb();
  const year = new Date().getFullYear().toString();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(
      (SELECT SUM(cost) FROM maintenance_records WHERE date LIKE ? || '%')
      + (SELECT SUM(cost) FROM repair_records WHERE date LIKE ? || '%')
      + (SELECT SUM(cost) FROM mot_records WHERE test_date LIKE ? || '%'),
      0
    ) as total`,
    year,
    year,
    year
  );
  return row?.total ?? 0;
}

export async function getOpenReminderCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM reminders WHERE completed_at IS NULL"
  );
  return row?.count ?? 0;
}

export async function getActivePurchaseCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM planned_purchases WHERE purchased_date IS NULL"
  );
  return row?.count ?? 0;
}

export async function getUpcomingMots(): Promise<
  Array<{ vehicleId: number; make: string; model: string; registration: string; expiryDate: string }>
> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const ninety = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return db.getAllAsync(
    `SELECT v.id as vehicleId, v.make, v.model, v.registration,
            m.expiry_date as expiryDate
     FROM mot_records m
     JOIN vehicles v ON v.id = m.vehicle_id
     WHERE v.archived = 0
       AND m.expiry_date BETWEEN ? AND ?
       AND m.id = (SELECT id FROM mot_records WHERE vehicle_id = v.id ORDER BY expiry_date DESC LIMIT 1)
     ORDER BY m.expiry_date ASC`,
    today,
    ninety
  );
}
