import type Database from "better-sqlite3";

const attachmentTableSql = (name: string) => `
  CREATE TABLE IF NOT EXISTS ${name} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_type TEXT NOT NULL CHECK (record_type IN ('maintenance', 'repair', 'mot', 'renewal')),
    record_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

export function migrate(database: Database.Database) {
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
      garage TEXT,
      workshop_id INTEGER REFERENCES workshops(id) ON DELETE SET NULL,
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
      renewal_type TEXT,
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

    CREATE TABLE IF NOT EXISTS vehicle_gallery_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      record_type TEXT CHECK (record_type IS NULL OR record_type IN ('maintenance', 'repair', 'mot')),
      record_id INTEGER,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      caption TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ${attachmentTableSql("record_attachments")}

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

    CREATE TABLE IF NOT EXISTS fuel_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      odometer INTEGER NOT NULL,
      volume_litres REAL NOT NULL,
      total_cost REAL,
      fuel_type TEXT NOT NULL DEFAULT 'petrol',
      full_tank INTEGER NOT NULL DEFAULT 1,
      station TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS renewals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('insurance', 'road-tax', 'warranty', 'breakdown', 'other')),
      provider TEXT,
      reference TEXT,
      start_date TEXT,
      end_date TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- A password-verified login waiting for its second factor. id is a SHA-256 of the cookie token.
    CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      admin_user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    -- Failed sign-in counters, keyed by account and by client.
    CREATE TABLE IF NOT EXISTS auth_throttle (
      key TEXT PRIMARY KEY,
      failures INTEGER NOT NULL DEFAULT 0,
      window_started_at TEXT NOT NULL,
      locked_until TEXT
    );

    -- One row per notification already sent, so the daily check never repeats itself.
    CREATE TABLE IF NOT EXISTS notification_log (
      key TEXT PRIMARY KEY,
      sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn(database, "vehicles", "purchase_price", "REAL");
  ensureColumn(database, "vehicles", "purchase_date", "TEXT");
  ensureColumn(database, "vehicles", "debug_destroyed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "vehicles", "sold", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(database, "maintenance_records", "garage", "TEXT");
  ensureColumn(database, "maintenance_records", "workshop_id", "INTEGER REFERENCES workshops(id) ON DELETE SET NULL");
  ensureColumn(database, "repair_records", "workshop_id", "INTEGER REFERENCES workshops(id) ON DELETE SET NULL");
  ensureColumn(database, "planned_purchases", "converted_to_type", "TEXT CHECK (converted_to_type IN ('maintenance', 'repair'))");
  ensureColumn(database, "planned_purchases", "converted_record_id", "INTEGER");
  ensureColumn(database, "planned_purchases", "converted_at", "TEXT");
  ensureColumn(database, "reminders", "renewal_type", "TEXT");
  ensureColumn(database, "admin_users", "totp_secret", "TEXT");
  ensureColumn(database, "admin_users", "totp_enabled_at", "TEXT");
  ensureColumn(database, "admin_users", "totp_last_counter", "INTEGER");
  ensureColumn(database, "admin_users", "totp_pending_secret", "TEXT");
  ensureColumn(database, "admin_users", "recovery_codes", "TEXT");
  ensureColumn(database, "auth_sessions", "user_agent", "TEXT");
  ensureColumn(database, "auth_sessions", "last_seen_at", "TEXT");
  allowRenewalAttachments(database);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_gallery_photos_vehicle ON vehicle_gallery_photos(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_archived ON vehicles(archived);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_admin ON auth_sessions(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_workshops_preferred ON workshops(preferred);
    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_repairs_vehicle ON repair_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_mot_vehicle ON mot_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON reminders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_planned_purchases_vehicle ON planned_purchases(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_planned_purchases_reminder ON planned_purchases(reminder_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_record ON record_attachments(record_type, record_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_vehicle ON record_attachments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vehicle_service_intervals_vehicle ON vehicle_service_intervals(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_vehicle_service_intervals_reminder ON vehicle_service_intervals(reminder_id);
    CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_records(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_renewals_vehicle ON renewals(vehicle_id, type);
  `);
}

function ensureColumn(database: Database.Database, table: string, column: string, definition: string) {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

/**
 * Older installs created record_attachments with a CHECK that only allows maintenance, repair
 * and MOT records. SQLite cannot alter a CHECK in place, so rebuild the table once to allow
 * renewal documents too. Nothing references this table, so the swap is safe.
 */
function allowRenewalAttachments(database: Database.Database) {
  const row = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'record_attachments'").get() as { sql: string } | undefined;
  if (!row || row.sql.includes("'renewal'")) return;
  database.transaction(() => {
    database.exec(attachmentTableSql("record_attachments_next"));
    database.exec(`
      INSERT INTO record_attachments_next (id, record_type, record_id, vehicle_id, filename, original_filename, mime_type, file_size, file_path, created_at)
      SELECT id, record_type, record_id, vehicle_id, filename, original_filename, mime_type, file_size, file_path, created_at FROM record_attachments;
      DROP TABLE record_attachments;
      ALTER TABLE record_attachments_next RENAME TO record_attachments;
    `);
  })();
}
