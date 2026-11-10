/** Form parsing and post-mutation helpers shared by the server action modules. Not itself a server action module. */
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncShowcaseDemoBackupIfActive } from "@/lib/backup";
import { getOrCreateWorkshopByName } from "@/lib/db";
import { safeUploadPath } from "@/lib/paths";

export function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function nullableStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? value : null;
}

export function nullableInt(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseInt(value, 10) : null;
}

export function money(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseFloat(value) : 0;
}

export function nullableMoney(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseFloat(value) : null;
}

export function workshopInput(formData: FormData) {
  return {
    name: z.string().min(1).max(100).parse(str(formData, "name")),
    address: nullableStr(formData, "address"),
    phone: nullableStr(formData, "phone"),
    email: nullableStr(formData, "email"),
    website: nullableStr(formData, "website"),
    notes: nullableStr(formData, "notes"),
    preferred: str(formData, "preferred") === "on"
  };
}

export function recordWorkshopInput(formData: FormData) {
  const raw = nullableStr(formData, "garage");
  if (!raw) return { garage: null, workshopId: null };
  const workshop = getOrCreateWorkshopByName(raw);
  return { garage: workshop.name, workshopId: workshop.id };
}

export const credentialsSchema = z.object({
  username: z.string().min(2).max(48),
  password: z.string().min(8).max(256)
});

export function revalidateVehicle(vehicleId: number) {
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export function debugSettingsUrl(debug: string, message?: string) {
  const params = new URLSearchParams({ tab: "backup", debug });
  if (message) params.set("message", message);
  return `/settings?${params.toString()}`;
}

export async function syncCurrentDemoAfterMutation() {
  await syncShowcaseDemoBackupIfActive();
}

export async function removeUploadFile(uploadPath: string | null) {
  if (!uploadPath?.startsWith("/uploads/")) return;
  const parts = uploadPath.replace(/^\/uploads\//, "").split("/").map((part) => decodeURIComponent(part));
  try {
    await fs.unlink(safeUploadPath(parts));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const dir = path.dirname(safeUploadPath(parts));
  try {
    await fs.rmdir(dir);
  } catch {
    // Ignore non-empty upload directories.
  }
}

export const galleryRecordTypeSchema = z.enum(["maintenance", "repair", "mot"]).nullable();

export function fuelInput(formData: FormData, settings: { fuelVolumeUnit?: string }) {
  const rawVolume = z.coerce.number().positive().parse(str(formData, "volume"));
  const volumeLitres = settings.fuelVolumeUnit === "gallons" ? rawVolume * 3.78541 : rawVolume;
  return {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: z.coerce.number().int().nonnegative().parse(str(formData, "odometer")),
    volumeLitres,
    totalCost: nullableMoney(formData, "totalCost"),
    fuelType: z.enum(["petrol", "diesel", "lpg", "other"]).parse(str(formData, "fuelType")),
    fullTank: str(formData, "fullTank") === "on" ? 1 : 0,
    station: nullableStr(formData, "station"),
    notes: nullableStr(formData, "notes"),
  };
}
