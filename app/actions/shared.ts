/** Form parsing and post-mutation helpers shared by the server action modules. Not itself a server action module. */
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncShowcaseDemoBackupIfActive } from "@/lib/backup";
import { getOrCreateWorkshopByName } from "@/lib/db";
import { isIsoDate } from "@/lib/dates";
import { safeUploadPath } from "@/lib/paths";

export function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function nullableStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? value : null;
}

/**
 * Number and date fields are validated here as well as in the browser: a client without a native
 * date picker, or a script, could otherwise store "next tuesday" as a date, which then crashed
 * every page that formats it.
 */
export function nullableInt(formData: FormData, key: string) {
  const value = str(formData, key);
  if (!value.length) return null;
  return z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).parse(Math.trunc(Number(value)));
}

export function money(formData: FormData, key: string) {
  return nullableMoney(formData, key) ?? 0;
}

export function nullableMoney(formData: FormData, key: string) {
  const value = str(formData, key);
  if (!value.length) return null;
  return z.number().finite().min(-1e9).max(1e9).parse(Number(value));
}

const isoDateSchema = z.string().refine(isIsoDate, "Enter a date as YYYY-MM-DD");

export function isoDate(formData: FormData, key: string) {
  return isoDateSchema.parse(str(formData, key));
}

export function nullableIsoDate(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? isoDateSchema.parse(value) : null;
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

/** An optional web link. Only http(s) is accepted, so a stored link can never be a javascript: or data: URL. */
export function optionalHttpUrl(formData: FormData, key: string) {
  const value = nullableStr(formData, key);
  if (!value) return null;
  const url = z.string().max(2000).url().parse(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  if (!/^https?:$/i.test(new URL(url).protocol)) throw new z.ZodError([{ code: "custom", path: [key], message: "Use an http:// or https:// link", input: value }]);
  return url;
}

/** Required single-line text, trimmed, with a sensible length cap. */
export function requiredText(formData: FormData, key: string, max = 200) {
  return z.string().min(1).max(max).parse(str(formData, key));
}

/** Optional free text (notes, advisories), capped so one field can't bloat every page that shows it. */
export function optionalText(formData: FormData, key: string, max = 10_000) {
  return z.string().max(max).nullable().parse(nullableStr(formData, key));
}

/**
 * The fields shared by maintenance and repair records. Everything is validated before the garage
 * is looked up, because that lookup creates a workshop when the name is new: a rejected form must
 * not leave one behind.
 */
function serviceRecordFields(formData: FormData) {
  return {
    date: isoDate(formData, "date"),
    odometer: nullableInt(formData, "odometer"),
    cost: money(formData, "cost"),
    notes: optionalText(formData, "notes")
  };
}

export function maintenanceInput(formData: FormData) {
  const fields = { ...serviceRecordFields(formData), category: requiredText(formData, "category", 100), description: requiredText(formData, "description") };
  return { ...fields, ...recordWorkshopInput(formData) };
}

export function repairInput(formData: FormData) {
  const fields = { ...serviceRecordFields(formData), fault: requiredText(formData, "fault") };
  return { ...fields, ...recordWorkshopInput(formData) };
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
  // An image's gallery thumbnail, if it has one.
  await fs.rm(`${safeUploadPath(parts)}.thumb.webp`, { force: true });
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
    date: isoDate(formData, "date"),
    odometer: z.coerce.number().int().nonnegative().parse(str(formData, "odometer")),
    volumeLitres,
    totalCost: nullableMoney(formData, "totalCost"),
    fuelType: z.enum(["petrol", "diesel", "lpg", "other"]).parse(str(formData, "fuelType")),
    fullTank: str(formData, "fullTank") === "on" ? 1 : 0,
    station: nullableStr(formData, "station"),
    notes: nullableStr(formData, "notes"),
  };
}
