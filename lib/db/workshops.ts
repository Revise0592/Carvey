import { getDb } from "./connection";
import type { MaintenanceCategory, Workshop } from "./types";

type WorkshopInput = {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  preferred: boolean;
};

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

export function createWorkshop(input: WorkshopInput) {
  return getDb()
    .prepare(`
      INSERT INTO workshops (name, address, phone, email, website, notes, preferred)
      VALUES (@name, @address, @phone, @email, @website, @notes, @preferred)
    `)
    .run({ ...input, preferred: input.preferred ? 1 : 0 });
}

export function updateWorkshop(id: number, input: WorkshopInput) {
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

// ─── Maintenance categories ─────────────────────────────────────────────────

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
