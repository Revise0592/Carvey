"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { convertPlannedPurchaseToMaintenance, convertPlannedPurchaseToRepair, createPlannedPurchase, deletePlannedPurchase, markPlannedPurchaseBought, updatePlannedPurchase, updatePlannedPurchasePurchasedDate } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, nullableInt, nullableStr, recordWorkshopInput, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

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

export async function createMaintenanceFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData) {
  await requireUser();
  const workshop = recordWorkshopInput(formData);
  convertPlannedPurchaseToMaintenance(purchaseId, vehicleId, {
    date: z.string().min(1).parse(str(formData, "date")),
    odometer: nullableInt(formData, "odometer"),
    category: z.string().min(1).parse(str(formData, "category")),
    description: z.string().min(1).parse(str(formData, "description")),
    garage: workshop.garage,
    workshopId: workshop.workshopId,
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  });
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
}

export async function createRepairFromPurchaseAction(vehicleId: number, purchaseId: number, formData: FormData) {
  await requireUser();
  const workshop = recordWorkshopInput(formData);
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
