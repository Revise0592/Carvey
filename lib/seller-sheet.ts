import {
  getVehicle,
  listMaintenance,
  listMots,
  listReminders,
  listRepairs,
  type MaintenanceRecord,
  type MotRecord,
  type Reminder,
  type RepairRecord
} from "./db";

export type SellerSheetVehicle = {
  id: number;
  make: string;
  model: string;
  year: number | null;
  registration: string;
  vin: string | null;
  currentOdometer: number | null;
  effectiveOdometer: number | null;
  notes: string | null;
};

export type SellerSheetData = {
  vehicle: SellerSheetVehicle;
  maintenance: MaintenanceRecord[];
  repairs: RepairRecord[];
  mots: MotRecord[];
  reminders: Reminder[];
  totals: {
    maintenanceCount: number;
    repairCount: number;
    motCount: number;
    openReminderCount: number;
    loggedSpend: number;
  };
};

export function getSellerSheetData(vehicleId: number): SellerSheetData | null {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return null;

  const maintenance = listMaintenance(vehicle.id);
  const repairs = listRepairs(vehicle.id);
  const mots = listMots(vehicle.id);
  const reminders = listReminders(vehicle.id).filter((reminder) => !reminder.completedAt);
  const loggedSpend = [...maintenance, ...repairs, ...mots].reduce((total, record) => total + record.cost, 0);

  return {
    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      registration: vehicle.registration,
      vin: vehicle.vin,
      currentOdometer: vehicle.currentOdometer,
      effectiveOdometer: vehicle.effectiveOdometer,
      notes: vehicle.notes
    },
    maintenance,
    repairs,
    mots,
    reminders,
    totals: {
      maintenanceCount: maintenance.length,
      repairCount: repairs.length,
      motCount: mots.length,
      openReminderCount: reminders.length,
      loggedSpend
    }
  };
}
