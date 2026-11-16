"use server";

import { revalidatePath } from "next/cache";
import { convertPlannedPurchaseToMaintenance, convertPlannedPurchaseToRepair, createPlannedPurchase, deletePlannedPurchase, markPlannedPurchaseBought, updatePlannedPurchase, updatePlannedPurchasePurchasedDate } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { type FormResult, formResult, isoDate, maintenanceInput, money, nullableInt, nullableIsoDate, nullableStr, optionalHttpUrl, repairInput, requiredText, revalidateVehicle, syncCurrentDemoAfterMutation } from "./shared";

export async function createPlannedPurchaseAction(vehicleId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    createPlannedPurchase({
      vehicleId,
      itemName: requiredText(formData, "itemName", 160),
      quantity: nullableInt(formData, "quantity") ?? 1,
      estimatedCost: money(formData, "estimatedCost"),
      supplier: nullableStr(formData, "supplier"),
      url: optionalHttpUrl(formData, "url"),
      dueDate: nullableIsoDate(formData, "dueDate"),
      dueOdometer: nullableInt(formData, "dueOdometer"),
      notes: nullableStr(formData, "notes")
    });
    await syncCurrentDemoAfterMutation();
    revalidatePath("/garage");
    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function updatePlannedPurchaseAction(vehicleId: number, id: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    updatePlannedPurchase(id, vehicleId, {
      itemName: requiredText(formData, "itemName", 160),
      quantity: nullableInt(formData, "quantity") ?? 1,
      estimatedCost: money(formData, "estimatedCost"),
      supplier: nullableStr(formData, "supplier"),
      url: optionalHttpUrl(formData, "url"),
      dueDate: nullableIsoDate(formData, "dueDate"),
      dueOdometer: nullableInt(formData, "dueOdometer"),
      notes: nullableStr(formData, "notes")
    });
    await syncCurrentDemoAfterMutation();
    revalidateVehicle(vehicleId);
  });
}

export async function updatePlannedPurchasePurchasedDateAction(vehicleId: number, id: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    updatePlannedPurchasePurchasedDate(id, vehicleId, isoDate(formData, "purchasedDate"));
    await syncCurrentDemoAfterMutation();
    revalidatePath("/garage");
    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function deletePlannedPurchaseAction(vehicleId: number, id: number) {
  await requireUser();
  deletePlannedPurchase(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function markPlannedPurchaseBoughtAction(vehicleId: number, id: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    markPlannedPurchaseBought(id, vehicleId, {
      purchasedDate: isoDate(formData, "purchasedDate"),
      actualCost: money(formData, "actualCost")
    });
    await syncCurrentDemoAfterMutation();
    revalidatePath("/garage");
    revalidatePath(`/vehicles/${vehicleId}`);
  });
}

export async function createMaintenanceFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    convertPlannedPurchaseToMaintenance(purchaseId, vehicleId, maintenanceInput(formData));
    await syncCurrentDemoAfterMutation();
    revalidateVehicle(vehicleId);
  });
}

export async function createRepairFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData): Promise<FormResult> {
  return formResult(async () => {
    await requireUser();
    convertPlannedPurchaseToRepair(purchaseId, vehicleId, repairInput(formData));
    await syncCurrentDemoAfterMutation();
    revalidateVehicle(vehicleId);
  });
}
