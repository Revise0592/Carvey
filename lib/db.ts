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
  archived: number;
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

export type RepairRecord = {
  id: number;
  vehicleId: number;
  date: string;
  odometer: number | null;
  fault: string;
  garage: string | null;
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

export type AdminUser = {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
};

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
      archived INTEGER NOT NULL DEFAULT 0,
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

    CREATE INDEX IF NOT EXISTS idx_vehicles_archived ON vehicles(archived);
    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repair_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_mot_vehicle ON mot_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id);
  `);
  ensureColumn(database, "vehicles", "purchase_price", "REAL");
  ensureColumn(database, "vehicles", "purchase_date", "TEXT");
}

function ensureColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

const vehicleSelect = `
  id,
  make,
  model,
  year,
  registration,
  vin,
  current_odometer as currentOdometer,
  purchase_price as purchasePrice,
  purchase_date as purchaseDate,
  photo_path as photoPath,
  thumbnail_path as thumbnailPath,
  notes,
  archived,
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
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `)
    .run({ id, ...input });
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

export function listMaintenance(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, date, odometer, category, description, cost, notes, created_at as createdAt FROM maintenance_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC")
    .all(vehicleId) as MaintenanceRecord[];
}

export function listRepairs(vehicleId: number) {
  return getDb()
    .prepare("SELECT id, vehicle_id as vehicleId, date, odometer, fault, garage, cost, notes, created_at as createdAt FROM repair_records WHERE vehicle_id = ? ORDER BY date DESC, id DESC")
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
    .prepare("INSERT INTO repair_records (vehicle_id, date, odometer, fault, garage, cost, notes) VALUES (@vehicleId, @date, @odometer, @fault, @garage, @cost, @notes)")
    .run(input);
}

export function updateRepair(id: number, vehicleId: number, input: Omit<RepairRecord, "id" | "vehicleId" | "createdAt">) {
  return getDb()
    .prepare("UPDATE repair_records SET date = @date, odometer = @odometer, fault = @fault, garage = @garage, cost = @cost, notes = @notes WHERE id = @id AND vehicle_id = @vehicleId")
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
      SELECT reminders.id, vehicle_id as vehicleId, title, due_date as dueDate, due_odometer as dueOdometer, vehicles.current_odometer as currentOdometer, make, model
      FROM reminders
      JOIN vehicles ON vehicles.id = reminders.vehicle_id
      WHERE completed_at IS NULL AND vehicles.archived = 0
      ORDER BY due_date ASC, due_odometer ASC
      LIMIT 8
    `)
    .all() as Array<{ id: number; vehicleId: number; title: string; dueDate: string | null; dueOdometer: number | null; currentOdometer: number | null; make: string; model: string }>;
  return { vehicles, yearlySpend: yearlySpend.total, upcomingMots, reminders };
}
