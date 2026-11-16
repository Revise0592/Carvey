"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createFuelRecord, createMaintenance, createMot, createRepair, deleteFuelRecord, deleteMaintenance, deleteMot, deleteRepair, listAndDeleteAttachmentsForRecord, listMots, updateFuelRecord, updateMaintenance, updateMot, updateRepair, upsertMotReminder } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";
import { fuelInput, isoDate, maintenanceInput, money, nullableInt, nullableStr, removeUploadFile, repairInput, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

export async function createMaintenanceAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createMaintenance({ vehicleId, ...maintenanceInput(formData) });
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateMaintenanceAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateMaintenance(id, vehicleId, maintenanceInput(formData));
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
  createRepair({ vehicleId, ...repairInput(formData) });
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateRepairAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateRepair(id, vehicleId, repairInput(formData));
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
  const expiryDate = isoDate(formData, "expiryDate");
  createMot({
    vehicleId,
    testDate: isoDate(formData, "testDate"),
    expiryDate,
    odometer: nullableInt(formData, "odometer"),
    result: z.enum(["pass", "fail", "advisory"]).parse(str(formData, "result")),
    advisories: nullableStr(formData, "advisories"),
    cost: money(formData, "cost"),
    certificateRef: nullableStr(formData, "certificateRef")
  });
  upsertMotReminder(vehicleId, expiryDate, getMotLabel(getRegionalSettings()));
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updateMotAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  const expiryDate = isoDate(formData, "expiryDate");
  updateMot(id, vehicleId, {
    testDate: isoDate(formData, "testDate"),
    expiryDate,
    odometer: nullableInt(formData, "odometer"),
    result: z.enum(["pass", "fail", "advisory"]).parse(str(formData, "result")),
    advisories: nullableStr(formData, "advisories"),
    cost: money(formData, "cost"),
    certificateRef: nullableStr(formData, "certificateRef")
  });
  const latestExpiry = listMots(vehicleId)[0]?.expiryDate ?? expiryDate;
  upsertMotReminder(vehicleId, latestExpiry, getMotLabel(getRegionalSettings()));
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

export async function createFuelRecordAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const settings = getRegionalSettings();
  createFuelRecord({ vehicleId, ...fuelInput(formData, settings) });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function updateFuelRecordAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  const settings = getRegionalSettings();
  updateFuelRecord(id, vehicleId, fuelInput(formData, settings));
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function deleteFuelRecordAction(vehicleId: number, id: number) {
  await requireUser();
  deleteFuelRecord(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}
