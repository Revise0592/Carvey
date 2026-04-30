"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  completeReminder,
  createMaintenance,
  createMot,
  createReminder,
  createRepair,
  createVehicle,
  deleteMaintenance,
  deleteMot,
  deleteReminder,
  deleteRepair,
  deleteVehicle,
  getVehicle,
  setVehicleDebugDestroyed,
  updateMaintenance,
  updateMot,
  updateReminder,
  updateRepair,
  updateVehicle,
  upsertMotReminder
} from "@/lib/db";
import { changePassword, changeUsername, createFirstAdmin, login, logout, requireUser } from "@/lib/auth";
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
    notes: nullableStr(formData, "notes")
  });
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
  revalidatePath("/garage");
  redirect("/garage");
}

export async function updateVehicleDebugAction(vehicleId: number, formData: FormData) {
  await requireUser();
  if (!debugEasterEggsEnabled()) return;
  setVehicleDebugDestroyed(vehicleId, str(formData, "debugDestroyed") === "on");
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
  revalidatePath(`/vehicles/${vehicleId}`);
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
  revalidateVehicle(vehicleId);
}

export async function deleteMaintenanceAction(vehicleId: number, id: number) {
  await requireUser();
  deleteMaintenance(id, vehicleId);
  revalidateVehicle(vehicleId);
}

export async function createRepairAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createRepair({
    vehicleId,
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    fault: z.string().min(1).parse(str(formData, "fault")),
    garage: nullableStr(formData, "garage"),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateRepairAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateRepair(id, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    fault: z.string().min(1).parse(str(formData, "fault")),
    garage: nullableStr(formData, "garage"),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  revalidateVehicle(vehicleId);
}

export async function deleteRepairAction(vehicleId: number, id: number) {
  await requireUser();
  deleteRepair(id, vehicleId);
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
  revalidateVehicle(vehicleId);
}

export async function deleteMotAction(vehicleId: number, id: number) {
  await requireUser();
  deleteMot(id, vehicleId);
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
  revalidateVehicle(vehicleId);
}

export async function deleteReminderAction(vehicleId: number, id: number) {
  await requireUser();
  deleteReminder(id, vehicleId);
  revalidateVehicle(vehicleId);
}

export async function completeReminderAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const id = Number.parseInt(str(formData, "id"), 10);
  completeReminder(id, vehicleId);
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateUsernameAction(formData: FormData) {
  const user = await requireUser();
  const username = z.string().min(2).max(48).parse(str(formData, "username"));
  changeUsername(user.id, username);
  revalidatePath("/settings");
  redirect("/settings?account=username-updated");
}

export async function updatePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = z.string().min(1).parse(str(formData, "currentPassword"));
  const nextPassword = z.string().min(8).max(256).parse(str(formData, "nextPassword"));
  const ok = await changePassword(user.id, currentPassword, nextPassword);
  if (!ok) redirect("/settings?account=password-error");
  redirect("/settings?account=password-updated");
}

function revalidateVehicle(vehicleId: number) {
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
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
