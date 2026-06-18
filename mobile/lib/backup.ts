import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { getDb } from "./db";

export async function exportBackup(): Promise<void> {
  const db = await getDb();

  const [vehicles, maintenance, repairs, mots, reminders, purchases, settings] =
    await Promise.all([
      db.getAllAsync("SELECT * FROM vehicles"),
      db.getAllAsync("SELECT * FROM maintenance_records"),
      db.getAllAsync("SELECT * FROM repair_records"),
      db.getAllAsync("SELECT * FROM mot_records"),
      db.getAllAsync("SELECT * FROM reminders"),
      db.getAllAsync("SELECT * FROM planned_purchases"),
      db.getAllAsync("SELECT key, value FROM app_settings"),
    ]);

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    vehicles,
    maintenance,
    repairs,
    mots,
    reminders,
    purchases,
    settings,
  };

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `carvey_backup_${date}.json`;
  const content = JSON.stringify(backup, null, 2);

  if (Platform.OS === "android") {
    try {
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          "application/json"
        );
        await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
        return;
      }
    } catch {
      // Fall through to share sheet
    }
  }

  const path = (FileSystem.documentDirectory ?? "") + fileName;
  await FileSystem.writeAsStringAsync(path, content);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: "Export Carvey Backup",
      UTI: "public.json",
    });
  }
}

export type ImportResult = {
  vehiclesImported: number;
  recordsImported: number;
  error?: string;
};

export async function importBackup(): Promise<ImportResult | null> {
  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
  });

  if (pickerResult.canceled || !pickerResult.assets?.[0]) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backup: any;

  try {
    const content = await FileSystem.readAsStringAsync(pickerResult.assets[0].uri);
    backup = JSON.parse(content);
  } catch {
    return { vehiclesImported: 0, recordsImported: 0, error: "Could not read backup file." };
  }

  if (!backup.version || !Array.isArray(backup.vehicles)) {
    return { vehiclesImported: 0, recordsImported: 0, error: "Invalid backup format." };
  }

  const db = await getDb();
  let vehiclesImported = 0;
  let recordsImported = 0;

  for (const v of backup.vehicles) {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM vehicles WHERE registration = ?",
      String(v.registration)
    );

    let vehicleId: number;
    if (existing) {
      vehicleId = existing.id;
    } else {
      const r = await db.runAsync(
        `INSERT INTO vehicles
           (make, model, year, registration, vin, current_odometer, purchase_price,
            purchase_date, notes, archived, sold, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        String(v.make),
        String(v.model),
        v.year ?? null,
        String(v.registration),
        v.vin ?? null,
        v.current_odometer ?? null,
        v.purchase_price ?? null,
        v.purchase_date ?? null,
        v.notes ?? null,
        Number(v.archived ?? 0),
        Number(v.sold ?? 0),
        String(v.created_at ?? new Date().toISOString()),
        String(v.updated_at ?? new Date().toISOString())
      );
      vehicleId = r.lastInsertRowId;
      vehiclesImported++;
    }

    const oldId = Number(v.id);

    for (const m of (backup.maintenance ?? []).filter((r: any) => Number(r.vehicle_id) === oldId)) {
      await db.runAsync(
        `INSERT INTO maintenance_records
           (vehicle_id, date, odometer, category, description, cost, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        vehicleId,
        String(m.date),
        m.odometer ?? null,
        String(m.category),
        String(m.description),
        Number(m.cost ?? 0),
        m.notes ?? null,
        String(m.created_at ?? new Date().toISOString())
      );
      recordsImported++;
    }

    for (const r of (backup.repairs ?? []).filter((r: any) => Number(r.vehicle_id) === oldId)) {
      await db.runAsync(
        `INSERT INTO repair_records
           (vehicle_id, date, odometer, fault, garage, cost, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        vehicleId,
        String(r.date),
        r.odometer ?? null,
        String(r.fault),
        r.garage ?? null,
        Number(r.cost ?? 0),
        r.notes ?? null,
        String(r.created_at ?? new Date().toISOString())
      );
      recordsImported++;
    }

    for (const m of (backup.mots ?? []).filter((r: any) => Number(r.vehicle_id) === oldId)) {
      await db.runAsync(
        `INSERT INTO mot_records
           (vehicle_id, test_date, expiry_date, odometer, result, advisories, cost, certificate_ref, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        vehicleId,
        String(m.test_date),
        String(m.expiry_date),
        m.odometer ?? null,
        String(m.result),
        m.advisories ?? null,
        Number(m.cost ?? 0),
        m.certificate_ref ?? null,
        String(m.created_at ?? new Date().toISOString())
      );
      recordsImported++;
    }

    for (const r of (backup.reminders ?? []).filter((r: any) => Number(r.vehicle_id) === oldId)) {
      await db.runAsync(
        `INSERT INTO reminders
           (vehicle_id, title, due_date, due_odometer, recurrence, completed_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        vehicleId,
        String(r.title),
        r.due_date ?? null,
        r.due_odometer ?? null,
        r.recurrence ?? null,
        r.completed_at ?? null,
        String(r.created_at ?? new Date().toISOString())
      );
      recordsImported++;
    }

    for (const p of (backup.purchases ?? []).filter((r: any) => Number(r.vehicle_id) === oldId)) {
      await db.runAsync(
        `INSERT INTO planned_purchases
           (vehicle_id, item_name, quantity, estimated_cost, supplier, due_date,
            notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        vehicleId,
        String(p.item_name),
        Number(p.quantity ?? 1),
        Number(p.estimated_cost ?? 0),
        p.supplier ?? null,
        p.due_date ?? null,
        p.notes ?? null,
        String(p.created_at ?? new Date().toISOString()),
        String(p.updated_at ?? p.created_at ?? new Date().toISOString())
      );
      recordsImported++;
    }
  }

  return { vehiclesImported, recordsImported };
}
