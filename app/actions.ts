"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { activateShowcaseDemoData, restorePreviousDebugDemoData, saveCurrentDataAsShowcaseDemo, syncShowcaseDemoBackupIfActive } from "@/lib/backup";
import {
  completeReminder,
  convertPlannedPurchaseToMaintenance,
  convertPlannedPurchaseToRepair,
  createAttachment,
  createMaintenance,
  createMaintenanceCategory,
  createMot,
  createPlannedPurchase,
  createReminder,
  createRepair,
  createWorkshop,
  createVehicle,
  deleteAttachment,
  deleteMaintenance,
  deleteMaintenanceCategory,
  deleteMot,
  deletePlannedPurchase,
  deleteReminder,
  deleteRepair,
  deleteWorkshop,
  deleteVehicle,
  getAttachment,
  listAndDeleteAttachmentsForRecord,
  markPlannedPurchaseBought,
  getOrCreateWorkshopByName,
  getVehicle,
  setVehicleDebugDestroyed,
  updateCollectionName,
  updateMaintenance,
  updateMaintenanceCategory,
  updateMot,
  updatePlannedPurchase,
  updatePlannedPurchasePurchasedDate,
  updateReminder,
  updateRepair,
  updateVehicle,
  updateWorkshop,
  upsertMotReminder
} from "@/lib/db";
import { changePassword, changeUsername, createFirstAdmin, login, logout, requireUser } from "@/lib/auth";
import { updateRegionalSettings } from "@/lib/regional-settings";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { safeUploadPath } from "@/lib/paths";

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableStr(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? value : null;
}

function nullableInt(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseInt(value, 10) : null;
}

function money(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseFloat(value) : 0;
}

function nullableMoney(formData: FormData, key: string) {
  const value = str(formData, key);
  return value.length ? Number.parseFloat(value) : null;
}


function workshopInput(formData: FormData) {
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

function repairWorkshopInput(formData: FormData) {
  const raw = nullableStr(formData, "garage");
  if (!raw) return { garage: null, workshopId: null };
  const workshop = getOrCreateWorkshopByName(raw);
  return { garage: workshop.name, workshopId: workshop.id };
}

const credentialsSchema = z.object({
  username: z.string().min(2).max(48),
  password: z.string().min(8).max(256)
});

export async function setupAction(formData: FormData) {
  const parsed = credentialsSchema.parse({
    username: str(formData, "username"),
    password: str(formData, "password")
  });
  await createFirstAdmin(parsed.username, parsed.password);
  await login(parsed.username, parsed.password);
  redirect("/garage");
}

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.parse({
    username: str(formData, "username"),
    password: str(formData, "password")
  });
  const ok = await login(parsed.username, parsed.password);
  if (!ok) redirect("/login?error=1");
  redirect("/garage");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}

export async function createVehicleAction(formData: FormData) {
  await requireUser();
  const input = {
    make: z.string().min(1).parse(str(formData, "make")),
    model: z.string().min(1).parse(str(formData, "model")),
    year: nullableInt(formData, "year"),
    registration: z.string().min(1).parse(str(formData, "registration")).toUpperCase(),
    vin: nullableStr(formData, "vin"),
    currentOdometer: nullableInt(formData, "currentOdometer"),
    purchasePrice: nullableMoney(formData, "purchasePrice"),
    purchaseDate: nullableStr(formData, "purchaseDate"),
    notes: nullableStr(formData, "notes")
  };
  const result = createVehicle(input);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  redirect(`/vehicles/${result.lastInsertRowid}`);
}

export async function updateVehicleAction(vehicleId: number, formData: FormData) {
  await requireUser();
  updateVehicle(vehicleId, {
    make: z.string().min(1).parse(str(formData, "make")),
    model: z.string().min(1).parse(str(formData, "model")),
    year: nullableInt(formData, "year"),
    registration: z.string().min(1).parse(str(formData, "registration")).toUpperCase(),
    vin: nullableStr(formData, "vin"),
    currentOdometer: nullableInt(formData, "currentOdometer"),
    purchasePrice: nullableMoney(formData, "purchasePrice"),
    purchaseDate: nullableStr(formData, "purchaseDate"),
    notes: nullableStr(formData, "notes"),
    sold: str(formData, "sold") === "on"
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteVehicleAction(vehicleId: number, formData: FormData) {
  await requireUser();
  if (str(formData, "confirmed") !== "on") return;
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) redirect("/garage");
  await removeUploadFile(vehicle.photoPath);
  await removeUploadFile(vehicle.thumbnailPath);
  deleteVehicle(vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  redirect("/garage");
}

export async function updateVehicleDebugAction(vehicleId: number, formData: FormData) {
  await requireUser();
  if (!debugEasterEggsEnabled()) return;
  setVehicleDebugDestroyed(vehicleId, str(formData, "debugDestroyed") === "on");
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function createMaintenanceAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createMaintenance({
    vehicleId,
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    category: z.string().min(1).parse(str(formData, "category")),
    description: z.string().min(1).parse(str(formData, "description")),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function createMaintenanceFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData) {
  await requireUser();
  convertPlannedPurchaseToMaintenance(purchaseId, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    category: z.string().min(1).parse(str(formData, "category")),
    description: z.string().min(1).parse(str(formData, "description")),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function updateMaintenanceAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateMaintenance(id, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    category: z.string().min(1).parse(str(formData, "category")),
    description: z.string().min(1).parse(str(formData, "description")),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteMaintenanceAction(vehicleId: number, id: number) {
  await requireUser();
  const orphaned = listAndDeleteAttachmentsForRecord("maintenance", id);
  for (const a of orphaned) await removeUploadFile(a.filePath);
  deleteMaintenance(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function createRepairAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const workshop = repairWorkshopInput(formData);
  createRepair({
    vehicleId,
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    fault: z.string().min(1).parse(str(formData, "fault")),
    garage: workshop.garage,
    workshopId: workshop.workshopId,
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function createRepairFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData) {
  await requireUser();
  const workshop = repairWorkshopInput(formData);
  convertPlannedPurchaseToRepair(purchaseId, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    fault: z.string().min(1).parse(str(formData, "fault")),
    garage: workshop.garage,
    workshopId: workshop.workshopId,
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function updateRepairAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  const workshop = repairWorkshopInput(formData);
  updateRepair(id, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    fault: z.string().min(1).parse(str(formData, "fault")),
    garage: workshop.garage,
    workshopId: workshop.workshopId,
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteRepairAction(vehicleId: number, id: number) {
  await requireUser();
  const orphaned = listAndDeleteAttachmentsForRecord("repair", id);
  for (const a of orphaned) await removeUploadFile(a.filePath);
  deleteRepair(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function createMotAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const expiryDate = z.string().min(1).parse(str(formData, "expiryDate"));
  createMot({
    vehicleId,
    testDate: z.string().min(1).parse(str(formData, "testDate")),
    expiryDate,
    odometer: nullableInt(formData, "odometer"),
    result: z.enum(["pass", "fail", "advisory"]).parse(str(formData, "result")),
    advisories: nullableStr(formData, "advisories"),
    cost: money(formData, "cost"),
    certificateRef: nullableStr(formData, "certificateRef")
  });
  upsertMotReminder(vehicleId, expiryDate);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateMotAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  const expiryDate = z.string().min(1).parse(str(formData, "expiryDate"));
  updateMot(id, vehicleId, {
    testDate: z.string().min(1).parse(str(formData, "testDate")),
    expiryDate,
    odometer: nullableInt(formData, "odometer"),
    result: z.enum(["pass", "fail", "advisory"]).parse(str(formData, "result")),
    advisories: nullableStr(formData, "advisories"),
    cost: money(formData, "cost"),
    certificateRef: nullableStr(formData, "certificateRef")
  });
  upsertMotReminder(vehicleId, expiryDate);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteMotAction(vehicleId: number, id: number) {
  await requireUser();
  const orphaned = listAndDeleteAttachmentsForRecord("mot", id);
  for (const a of orphaned) await removeUploadFile(a.filePath);
  deleteMot(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function createReminderAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createReminder({
    vehicleId,
    title: z.string().min(1).parse(str(formData, "title")),
    dueDate: nullableStr(formData, "dueDate"),
    dueOdometer: nullableInt(formData, "dueOdometer"),
    recurrence: nullableStr(formData, "recurrence")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateReminderAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateReminder(id, vehicleId, {
    title: z.string().min(1).parse(str(formData, "title")),
    dueDate: nullableStr(formData, "dueDate"),
    dueOdometer: nullableInt(formData, "dueOdometer"),
    recurrence: nullableStr(formData, "recurrence"),
    completedAt: null
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteReminderAction(vehicleId: number, id: number) {
  await requireUser();
  deleteReminder(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function completeReminderAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const id = Number.parseInt(str(formData, "id"), 10);
  completeReminder(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function createPlannedPurchaseAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createPlannedPurchase({
    vehicleId,
    itemName: z.string().min(1).max(160).parse(str(formData, "itemName")),
    quantity: nullableInt(formData, "quantity") ?? 1,
    estimatedCost: money(formData, "estimatedCost"),
    supplier: nullableStr(formData, "supplier"),
    url: nullableStr(formData, "url"),
    dueDate: nullableStr(formData, "dueDate"),
    dueOdometer: nullableInt(formData, "dueOdometer"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updatePlannedPurchaseAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updatePlannedPurchase(id, vehicleId, {
    itemName: z.string().min(1).max(160).parse(str(formData, "itemName")),
    quantity: nullableInt(formData, "quantity") ?? 1,
    estimatedCost: money(formData, "estimatedCost"),
    supplier: nullableStr(formData, "supplier"),
    url: nullableStr(formData, "url"),
    dueDate: nullableStr(formData, "dueDate"),
    dueOdometer: nullableInt(formData, "dueOdometer"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function updatePlannedPurchasePurchasedDateAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updatePlannedPurchasePurchasedDate(id, vehicleId, z.string().min(1).parse(str(formData, "purchasedDate")));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deletePlannedPurchaseAction(vehicleId: number, id: number) {
  await requireUser();
  deletePlannedPurchase(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function markPlannedPurchaseBoughtAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  markPlannedPurchaseBought(id, vehicleId, {
    purchasedDate: z.string().min(1).parse(str(formData, "purchasedDate")),
    actualCost: money(formData, "actualCost")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateUsernameAction(formData: FormData) {
  const user = await requireUser();
  if (user.id === 0) redirect("/settings?tab=admin&account=auth-disabled");
  const username = z.string().min(2).max(48).parse(str(formData, "username"));
  changeUsername(user.id, username);
  revalidatePath("/settings");
  redirect("/settings?tab=admin&account=username-updated");
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireUser();
  if (user.id === 0) redirect("/settings?tab=admin&account=auth-disabled");
  const currentPassword = z.string().min(1).parse(str(formData, "currentPassword"));
  const nextPassword = z.string().min(8).max(256).parse(str(formData, "nextPassword"));
  const ok = await changePassword(user.id, currentPassword, nextPassword);
  if (!ok) redirect("/settings?tab=admin&account=password-error");
  redirect("/settings?tab=admin&account=password-updated");
}

export async function updateCollectionNameAction(formData: FormData) {
  await requireUser();
  const collectionName = z.string().min(1).max(40).parse(str(formData, "collectionName"));
  updateCollectionName(collectionName);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath("/settings");
  redirect("/settings?tab=personalisation&app=collection-updated");
}

export async function createWorkshopAction(formData: FormData) {
  await requireUser();
  createWorkshop(workshopInput(formData));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=workshops&workshop=created");
}

export async function updateWorkshopAction(workshopId: number, formData: FormData) {
  await requireUser();
  updateWorkshop(workshopId, workshopInput(formData));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=workshops&workshop=updated");
}

export async function deleteWorkshopAction(workshopId: number, formData: FormData) {
  await requireUser();
  if (str(formData, "confirmed") !== "on") return;
  deleteWorkshop(workshopId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=workshops&workshop=deleted");
}

export async function createMaintenanceCategoryAction(formData: FormData) {
  await requireUser();
  createMaintenanceCategory(z.string().min(1).max(100).parse(str(formData, "name")));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=categories&category=created");
}

export async function updateMaintenanceCategoryAction(categoryId: number, formData: FormData) {
  await requireUser();
  updateMaintenanceCategory(categoryId, z.string().min(1).max(100).parse(str(formData, "name")));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=categories&category=updated");
}

export async function deleteMaintenanceCategoryAction(categoryId: number, formData: FormData) {
  await requireUser();
  if (str(formData, "confirmed") !== "on") return;
  deleteMaintenanceCategory(categoryId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=categories&category=deleted");
}

export async function loadShowcaseDemoDataAction() {
  await requireUser();
  if (!debugEasterEggsEnabled()) {
    redirect("/settings?tab=backup");
  }

  const result = await activateShowcaseDemoData();
  revalidatePath("/garage");
  revalidatePath("/settings");
  if (!result.ok) {
    redirect(debugSettingsUrl("error", result.message));
  }
  redirect(debugSettingsUrl("demo-loaded"));
}

export async function restorePreviousDemoDataAction() {
  await requireUser();
  if (!debugEasterEggsEnabled()) {
    redirect("/settings?tab=backup");
  }

  const result = await restorePreviousDebugDemoData();
  revalidatePath("/garage");
  revalidatePath("/settings");
  if (!result.ok) {
    redirect(debugSettingsUrl(result.message === "No previous live data snapshot is available." ? "missing-rollback" : "error", result.message));
  }
  redirect(debugSettingsUrl("previous-restored"));
}

export async function saveCurrentShowcaseDemoDataAction() {
  await requireUser();
  if (!debugEasterEggsEnabled()) {
    redirect("/settings?tab=backup");
  }

  const result = await saveCurrentDataAsShowcaseDemo();
  revalidatePath("/garage");
  revalidatePath("/settings");
  if (!result.ok) {
    redirect(debugSettingsUrl("error", result.message));
  }
  redirect(debugSettingsUrl("demo-saved"));
}

export async function updateRegionalSettingsAction(formData: FormData) {
  await requireUser();
  const currency = z.enum(["GBP", "USD", "EUR"]).parse(str(formData, "currency"));
  const motFeature = z.enum(["mot", "emissionsTest", "disabled"]).parse(str(formData, "motFeature"));
  const dateFormat = z.enum(["dd-mon-yyyy", "iso"]).parse(str(formData, "dateFormat"));
  const distanceUnit = z.enum(["miles", "km"]).parse(str(formData, "distanceUnit"));
  const plateStyle = z.enum(["uk-yellow", "uk-white"]).parse(str(formData, "plateStyle"));
  updateRegionalSettings({ currency, motFeature, dateFormat, distanceUnit, plateStyle });
  revalidatePath("/");
  redirect("/settings?tab=regional&app=regional-updated");
}

export async function updateAuthSettingsAction(formData: FormData) {
  await requireUser();
  const authDisabled = str(formData, "authDisabled") === "on";
  const confirmed = str(formData, "confirmed") === "on";
  if (authDisabled && !confirmed) redirect("/settings?tab=regional&app=auth-confirm-required");
  updateRegionalSettings({ authDisabled });
  revalidatePath("/");
  redirect("/settings?tab=regional&app=auth-updated");
}

export async function deleteAttachmentAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const attachmentId = z.coerce.number().int().positive().parse(str(formData, "attachmentId"));
  const attachment = getAttachment(attachmentId, vehicleId);
  if (!attachment) return;
  deleteAttachment(attachmentId, vehicleId);
  await removeUploadFile(attachment.filePath);
  revalidateVehicle(vehicleId);
}

function revalidateVehicle(vehicleId: number) {
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

function debugSettingsUrl(debug: string, message?: string) {
  const params = new URLSearchParams({ tab: "backup", debug });
  if (message) params.set("message", message);
  return `/settings?${params.toString()}`;
}

async function syncCurrentDemoAfterMutation() {
  await syncShowcaseDemoBackupIfActive();
}

async function removeUploadFile(uploadPath: string | null) {
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
