import Database from "better-sqlite3";
import path from "node:path";
import { ensureDataDirs, dataDir } from "./paths";

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

export type AdminUser = {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export type AuthSession = {
  id: string;
  adminUserId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
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

export const defaultCollectionName = "My cars";

let db: Database.Database | null = null;
export const dbFileName = "carvey.sqlite";

function openDb() {
  ensureDataDirs();
  const database = new Database(path.join(dataDir, dbFileName));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  return database;
}

export function getDb() {
  db ??= openDb();
  return db;
}

export function closeDbForTests() {
  db?.close();
  db = null;
}

export function closeDb() {
  closeDbForTests();
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

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

    CREATE INDEX IF NOT EXISTS idx_vehicles_archived ON vehicles(archived);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_admin ON auth_sessions(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_workshops_preferred ON workshops(preferred);
    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repair_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_mot_vehicle ON mot_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_planned_purchases_vehicle ON planned_purchases(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_planned_purchases_reminder ON planned_purchases(reminder_id);
  `);
  ensureColumn(database, "vehicles", "purchase_price", "REAL");
  ensureColumn(database, "vehicles", "purchase_date", "TEXT");
  ensureColumn(database, "vehicles", "debug_destroyed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "vehicles", "sold", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "repair_records", "workshop_id", "INTEGER REFERENCES workshops(id) ON DELETE SET NULL");
  ensureColumn(database, "planned_purchases", "converted_to_type", "TEXT CHECK (converted_to_type IN ('maintenance', 'repair'))");
  ensureColumn(database, "planned_purchases", "converted_record_id", "INTEGER");
  ensureColumn(database, "planned_purchases", "converted_at", "TEXT");
}

function ensureColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

const latestRecordedOdometerSelect = `
  SELECT MAX(odo) FROM (
    SELECT MAX(odometer) as odo FROM maintenance_records WHERE vehicle_id = vehicles.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM repair_records WHERE vehicle_id = vehicles.id
    UNION ALL
    SELECT MAX(odometer) as odo FROM mot_records WHERE vehicle_id = vehicles.id
  )
`;

const vehicleSelect = `
  id,
  make,
  model,
  year,
  registration,
  vin,
  COALESCE((${latestRecordedOdometerSelect}), current_odometer) as currentOdometer,
  purchase_price as purchasePrice,
  purchase_date as purchaseDate,
  photo_path as photoPath,
  thumbnail_path as thumbnailPath,
  notes,
  debug_destroyed as debugDestroyed,
  archived,
  sold,
  COALESCE((${latestRecordedOdometerSelect}), current_odometer) as effectiveOdometer,
  created_at as createdAt,
  updated_at as updatedAt
`;

export function hasAdminUser() {
  const row = getDb().prepare("SELECT id FROM admin_users LIMIT 1").get();
  return Boolean(row);
}

export function createAdminUser(username: string, passwordHash: string) {
  return getDb()
    .prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
}

export function getAdminByUsername(username: string) {
  return getDb()
    .prepare("SELECT id, username, password_hash as passwordHash, created_at as createdAt FROM admin_users WHERE username = ?")
    .get(username) as AdminUser | undefined;
}

export function getAdminById(id: number) {
  return getDb()
    .prepare("SELECT id, username, password_hash as passwordHash, created_at as createdAt FROM admin_users WHERE id = ?")
    .get(id) as AdminUser | undefined;
}

export function updateAdminUsername(id: number, username: string) {
  return getDb()
    .prepare("UPDATE admin_users SET username = ? WHERE id = ?")
    .run(username, id);
}

export function updateAdminPassword(id: number, passwordHash: string) {
  return getDb()
    .prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
    .run(passwordHash, id);
}

export function createAuthSession(id: string, adminUserId: number, expiresAt: string) {
  return getDb()
    .prepare("INSERT INTO auth_sessions (id, admin_user_id, expires_at) VALUES (?, ?, ?)")
    .run(id, adminUserId, expiresAt);
}

export function getAuthSession(id: string) {
  return getDb()
    .prepare(`
      SELECT
        id,
        admin_user_id as adminUserId,
        created_at as createdAt,
        expires_at as expiresAt,
        revoked_at as revokedAt
      FROM auth_sessions
      WHERE id = ?
    `)
    .get(id) as AuthSession | undefined;
}

export function revokeAuthSession(id: string) {
  return getDb()
    .prepare("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(id);
}

export function getAppSetting(key: string) {
  const row = getDb()
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppSetting(key: string, value: string) {
  return getDb()
    .prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)
    .run(key, value);
}

export function getCollectionName() {
  return getAppSetting("collectionName") ?? defaultCollectionName;
}

export function updateCollectionName(name: string) {
  return setAppSetting("collectionName", name);
}

const workshopSelect = `
  id,
  name,
  address,
  phone,
  email,
  website,
  notes,
  preferred,
  created_at as createdAt,
  updated_at as updatedAt
`;

export function listWorkshops() {
  return getDb()
    .prepare(`SELECT ${workshopSelect} FROM workshops ORDER BY preferred DESC, name COLLATE NOCASE ASC, id ASC`)
    .all() as Workshop[];
}

export function getWorkshop(id: number) {
  return getDb()
    .prepare(`SELECT ${workshopSelect} FROM workshops WHERE id = ?`)
    .get(id) as Workshop | undefined;
}

export function createWorkshop(input: {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: boolean;
}) {
  return getDb()
    .prepare(`
      INSERT INTO workshops (name, address, phone, email, website, notes, preferred)
      VALUES (@name, @address, @phone, @email, @website, @notes, @preferred)
    `)
    .run({ ...input, preferred: input.preferred ? 1 : 0 });
}

export function updateWorkshop(id: number, input: {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: boolean;
}) {
  return getDb()
    .prepare(`
      UPDATE workshops
      SET name = @name,
          address = @address,
          phone = @phone,
          email = @email,
          website = @website,
          notes = @notes,
          preferred = @preferred,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    .run({ id, ...input, preferred: input.preferred ? 1 : 0 });
}

export function deleteWorkshop(id: number) {
  return getDb()
    .prepare("DELETE FROM workshops WHERE id = ?")
    .run(id);
}

export function getOrCreateWorkshopByName(name: string): Workshop {
  const normalized = name.trim().replace(/\s+/g, " ");
  const db = getDb();
  const existing = db
    .prepare(`SELECT ${workshopSelect} FROM workshops WHERE lower(name) = lower(?)`)
    .get(normalized) as Workshop | undefined;
  if (existing) return existing;
  const result = db.prepare("INSERT INTO workshops (name) VALUES (?)").run(normalized);
  return getWorkshop(result.lastInsertRowid as number)!;
}

export function listMaintenanceCategories() {
  return getDb()
    .prepare("SELECT id, name, created_at as createdAt, updated_at as updatedAt FROM maintenance_categories ORDER BY name COLLATE NOCASE ASC")
    .all() as MaintenanceCategory[];
}

export function createMaintenanceCategory(name: string) {
  return getDb()
    .prepare("INSERT INTO maintenance_categories (name) VALUES (?)")
    .run(name);
}

export function updateMaintenanceCategory(id: number, name: string) {
  return getDb()
    .prepare("UPDATE maintenance_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(name, id);
}

export function deleteMaintenanceCategory(id: number) {
  return getDb()
    .prepare("DELETE FROM maintenance_categories WHERE id = ?")
    .run(id);
}

export function listVehicles() {
  return getDb()
    .prepare(`SELECT ${vehicleSelect} FROM vehicles WHERE archived = 0 ORDER BY updated_at DESC`)
    .all() as Vehicle[];
}

export function getVehicle(id: number) {
  return getDb()
    .prepare(`SELECT ${vehicleSelect} FROM vehicles WHERE id = ?`)
    .get(id) as Vehicle | undefined;
}

export function createVehicle(input: {
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  notes: string | null;
}) {
  return getDb()
    .prepare(`
      INSERT INTO vehicles (make, model, year, registration, vin, current_odometer, purchase_price, purchase_date, notes)
      VALUES (@make, @model, @year, @registration, @vin, @currentOdometer, @purchasePrice, @purchaseDate, @notes)
    `)
    .run(input);
}

export function updateVehicle(id: number, input: {
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
}) {
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

export function listMaintenance(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, date, odometer, category, description, cost, notes, created_at as createdAt FROM maintenance_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC")
    .all(vehicleId) as MaintenanceRecord[];
}

export function listRepairs(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, date, odometer, fault, garage, workshop_id as workshopId, cost, notes, created_at as createdAt FROM repair_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC")
    .all(vehicleId) as RepairRecord[];
}

export function listMots(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, test_date as testDate, expiry_date as expiryDate, odometer, result, advisories, cost, certificate_ref as certificateRef, created_at as createdAt FROM mot_records WHERE vehicle_id = ? ORDER BY expiry_date DESC, id DESC")
    .all(vehicleId) as MotRecord[];
}

export function listReminders(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, title, due_date as dueDate, due_odometer as dueOdometer, recurrence, completed_at as completedAt, created_at as createdAt FROM reminders WHERE vehicle_id = ? ORDER BY completed_at ASC, due_date ASC, due_odometer ASC")
    .all(vehicleId) as Reminder[];
}

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

export function createMaintenance(input: Omit<MaintenanceRecord, "id" | "createdAt">) {
  return getDb()
    .prepare("INSERT INTO maintenance_records (vehicle_id, date, odometer, category, description, cost, notes) VALUES (@vehicleId, @date, @odometer, @category, @description, @cost, @notes)")
    .run(input);
}

export function updateMaintenance(id: number, vehicleId: number, input: Omit<MaintenanceRecord, "id" | "vehicleId" | "createdAt">) {
  return getDb()
    .prepare("UPDATE maintenance_records SET date = @date, odometer = @odometer, category = @category, description = @description, cost = @cost, notes = @notes WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteMaintenance(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM maintenance_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function createRepair(input: Omit<RepairRecord, "id" | "createdAt">) {
  return getDb()
    .prepare("INSERT INTO repair_records (vehicle_id, date, odometer, fault, garage, workshop_id, cost, notes) VALUES (@vehicleId, @date, @odometer, @fault, @garage, @workshopId, @cost, @notes)")
    .run(input);
}

export function updateRepair(id: number, vehicleId: number, input: Omit<RepairRecord, "id" | "vehicleId" | "createdAt">) {
  return getDb()
    .prepare("UPDATE repair_records SET date = @date, odometer = @odometer, fault = @fault, garage = @garage, workshop_id = @workshopId, cost = @cost, notes = @notes WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteRepair(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM repair_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function createMot(input: Omit<MotRecord, "id" | "createdAt">) {
  return getDb()
    .prepare("INSERT INTO mot_records (vehicle_id, test_date, expiry_date, odometer, result, advisories, cost, certificate_ref) VALUES (@vehicleId, @testDate, @expiryDate, @odometer, @result, @advisories, @cost, @certificateRef)")
    .run(input);
}

export function updateMot(id: number, vehicleId: number, input: Omit<MotRecord, "id" | "vehicleId" | "createdAt">) {
  return getDb()
    .prepare("UPDATE mot_records SET test_date = @testDate, expiry_date = @expiryDate, odometer = @odometer, result = @result, advisories = @advisories, cost = @cost, certificate_ref = @certificateRef WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteMot(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM mot_records WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function createReminder(input: Omit<Reminder, "id" | "createdAt" | "completedAt">) {
  return getDb()
    .prepare("INSERT INTO reminders (vehicle_id, title, due_date, due_odometer, recurrence) VALUES (@vehicleId, @title, @dueDate, @dueOdometer, @recurrence)")
    .run(input);
}

export function upsertMotReminder(vehicleId: number, dueDate: string) {
  const existing = getDb()
    .prepare("SELECT id FROM reminders WHERE vehicle_id = ? AND title = ? AND completed_at IS NULL ORDER BY id DESC LIMIT 1")
    .get(vehicleId, "MOT due") as { id: number } | undefined;

  if (existing) {
    return getDb()
      .prepare("UPDATE reminders SET due_date = ?, due_odometer = NULL, recurrence = ? WHERE id = ? AND vehicle_id = ?")
      .run(dueDate, "12 months", existing.id, vehicleId);
  }

  return createReminder({
    vehicleId,
    title: "MOT due",
    dueDate,
    dueOdometer: null,
    recurrence: "12 months"
  });
}

export function updateReminder(id: number, vehicleId: number, input: Omit<Reminder, "id" | "vehicleId" | "createdAt">) {
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

export function createPlannedPurchase(input: Omit<PlannedPurchase, "id" | "reminderId" | "actualCost" | "purchasedDate" | "convertedToType" | "convertedRecordId" | "convertedAt" | "createdAt" | "updatedAt">) {
  const result = getDb()
    .prepare(`
      INSERT INTO planned_purchases (vehicle_id, item_name, quantity, estimated_cost, supplier, url, due_date, due_odometer, notes)
      VALUES (@vehicleId, @itemName, @quantity, @estimatedCost, @supplier, @url, @dueDate, @dueOdometer, @notes)
    `)
    .run(input);
  syncPlannedPurchaseReminder(Number(result.lastInsertRowid), input.vehicleId);
  return result;
}

export function updatePlannedPurchase(id: number, vehicleId: number, input: Omit<PlannedPurchase, "id" | "vehicleId" | "reminderId" | "actualCost" | "purchasedDate" | "convertedToType" | "convertedRecordId" | "convertedAt" | "createdAt" | "updatedAt">) {
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

export function convertPlannedPurchaseToMaintenance(
  id: number,
  vehicleId: number,
  input: Omit<MaintenanceRecord, "id" | "vehicleId" | "createdAt">
) {
  return getDb().transaction(() => {
    const plannedPurchase = getPlannedPurchase(id, vehicleId);
    if (!plannedPurchase?.purchasedDate || plannedPurchase.convertedAt) return { changes: 0 };
    const result = createMaintenance({ vehicleId, ...input });
    getDb()
      .prepare(`
        UPDATE planned_purchases
        SET converted_to_type = 'maintenance',
            converted_record_id = @recordId,
            converted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
          AND vehicle_id = @vehicleId
          AND purchased_date IS NOT NULL
          AND converted_at IS NULL
      `)
      .run({ id, vehicleId, recordId: Number(result.lastInsertRowid) });
    return result;
  })();
}

export function convertPlannedPurchaseToRepair(
  id: number,
  vehicleId: number,
  input: Omit<RepairRecord, "id" | "vehicleId" | "createdAt">
) {
  return getDb().transaction(() => {
    const plannedPurchase = getPlannedPurchase(id, vehicleId);
    if (!plannedPurchase?.purchasedDate || plannedPurchase.convertedAt) return { changes: 0 };
    const result = createRepair({ vehicleId, ...input });
    getDb()
      .prepare(`
        UPDATE planned_purchases
        SET converted_to_type = 'repair',
            converted_record_id = @recordId,
            converted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
          AND vehicle_id = @vehicleId
          AND purchased_date IS NOT NULL
          AND converted_at IS NULL
      `)
      .run({ id, vehicleId, recordId: Number(result.lastInsertRowid) });
    return result;
  })();
}

export function getVehicleLoggedSpend(vehicleId: number) {
  const row = getDb()
    .prepare(`
      SELECT COALESCE(SUM(cost), 0) as total FROM (
        SELECT cost FROM maintenance_records WHERE vehicle_id = ?
        UNION ALL
        SELECT cost FROM repair_records WHERE vehicle_id = ?
        UNION ALL
        SELECT cost FROM mot_records WHERE vehicle_id = ?
        UNION ALL
        SELECT COALESCE(actual_cost, estimated_cost) as cost FROM planned_purchases WHERE vehicle_id = ? AND purchased_date IS NOT NULL AND converted_at IS NULL
      )
    `)
    .get(vehicleId, vehicleId, vehicleId, vehicleId) as { total: number };
  return row.total;
}

export function getVehicleActivePlannedPurchaseSummary(vehicleId: number) {
  const row = getDb()
    .prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(estimated_cost), 0) as estimatedTotal
      FROM planned_purchases
      WHERE vehicle_id = ? AND purchased_date IS NULL
    `)
    .get(vehicleId) as { count: number; estimatedTotal: number };
  return row;
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

export function getDashboardStats() {
  const vehicles = listVehicles();
  const yearlySpend = getDb()
    .prepare(`
      SELECT COALESCE(SUM(cost), 0) as total FROM (
        SELECT cost, date FROM maintenance_records
        UNION ALL
        SELECT cost, date FROM repair_records
        UNION ALL
        SELECT cost, test_date as date FROM mot_records
        UNION ALL
        SELECT COALESCE(actual_cost, estimated_cost) as cost, purchased_date as date FROM planned_purchases WHERE purchased_date IS NOT NULL AND converted_at IS NULL
      )
      WHERE date >= date('now', 'start of year')
    `)
    .get() as { total: number };
  const upcomingMots = getDb()
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
    .all() as Array<{ vehicleId: number; make: string; model: string; registration: string; expiryDate: string }>;
  const reminders = getDb()
    .prepare(`
      SELECT reminders.id,
             vehicle_id as vehicleId,
             title,
             due_date as dueDate,
             due_odometer as dueOdometer,
             COALESCE((${latestRecordedOdometerSelect}), vehicles.current_odometer) as currentOdometer,
             make,
             model
      FROM reminders
      JOIN vehicles ON vehicles.id = reminders.vehicle_id
      WHERE completed_at IS NULL AND vehicles.archived = 0
      ORDER BY due_date ASC, due_odometer ASC
      LIMIT 8
    `)
    .all() as Array<{ id: number; vehicleId: number; title: string; dueDate: string | null; dueOdometer: number | null; currentOdometer: number | null; make: string; model: string }>;
  const plannedPurchases = getDb()
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
  const plannedPurchaseCount = getDb()
    .prepare(`
      SELECT COUNT(*) as count
      FROM planned_purchases
      JOIN vehicles ON vehicles.id = planned_purchases.vehicle_id
      WHERE purchased_date IS NULL AND vehicles.archived = 0
    `)
    .get() as { count: number };
  return { vehicles, yearlySpend: yearlySpend.total, upcomingMots, reminders, plannedPurchases, plannedPurchaseCount: plannedPurchaseCount.count };
}
