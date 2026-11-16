"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVehicle, deleteVehicle, getVehicle, setVehicleDebugDestroyed, updateVehicle } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { attachmentDir } from "@/lib/paths";
import { type FormResult, formResult, nullableInt, nullableIsoDate, nullableMoney, nullableStr, removeUploadFile, requiredText, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

export async function createVehicleAction(formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    const input = {
      make: requiredText(formData, "make"),
      model: requiredText(formData, "model"),
      year: nullableInt(formData, "year"),
      registration: requiredText(formData, "registration").toUpperCase(),
      vin: nullableStr(formData, "vin"),
      currentOdometer: nullableInt(formData, "currentOdometer"),
      purchasePrice: nullableMoney(formData, "purchasePrice"),
      purchaseDate: nullableIsoDate(formData, "purchaseDate"),
      notes: nullableStr(formData, "notes")
    };
    const result = createVehicle(input);
    await syncCurrentDemoAfterMutation();
    revalidatePath("/garage");
    redirect(`/vehicles/${result.lastInsertRowid}`);
  });
}

export async function updateVehicleAction(vehicleId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    updateVehicle(vehicleId, {
      make: requiredText(formData, "make"),
      model: requiredText(formData, "model"),
      year: nullableInt(formData, "year"),
      registration: requiredText(formData, "registration").toUpperCase(),
      vin: nullableStr(formData, "vin"),
      currentOdometer: nullableInt(formData, "currentOdometer"),
      purchasePrice: nullableMoney(formData, "purchasePrice"),
      purchaseDate: nullableIsoDate(formData, "purchaseDate"),
      notes: nullableStr(formData, "notes"),
      sold: str(formData, "sold") === "on"
    });
    await syncCurrentDemoAfterMutation();
    revalidateVehicle(vehicleId);
  });
}

export async function deleteVehicleAction(vehicleId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    if (str(formData, "confirmed") !== "on") return;
    const vehicle = getVehicle(vehicleId);
    if (!vehicle) redirect("/garage");
    await removeUploadFile(vehicle.photoPath);
    await removeUploadFile(vehicle.thumbnailPath);
    deleteVehicle(vehicleId);
    // Attachments and gallery photos live in uploads/attachments/<vehicleId>/. The rows go with the
    // vehicle (ON DELETE CASCADE), so remove the files too, or receipts and insurance documents for
    // a deleted car would stay on disk and in every future backup.
    if (Number.isSafeInteger(vehicle.id) && vehicle.id > 0) {
      await fs.rm(path.join(attachmentDir, String(vehicle.id)), { recursive: true, force: true });
    }
    await syncCurrentDemoAfterMutation();
    revalidatePath("/garage");
    redirect("/garage");
  });
}

export async function updateVehicleDebugAction(vehicleId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    if (!debugEasterEggsEnabled()) return;
    setVehicleDebugDestroyed(vehicleId, str(formData, "debugDestroyed") === "on");
    await syncCurrentDemoAfterMutation();
    revalidateVehicle(vehicleId);
  });
}
