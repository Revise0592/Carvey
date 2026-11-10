"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignServiceInterval, completeOrRepeatReminder, completeReminder, createReminder, deleteReminder, recordServiceDone, removeVehicleServiceInterval, updateReminder } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, nullableInt, nullableStr, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

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
  completeOrRepeatReminder(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function assignServiceIntervalAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const serviceIntervalId = nullableInt(formData, "serviceIntervalId");
  if (!serviceIntervalId) return;
  assignServiceInterval(vehicleId, serviceIntervalId);
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function removeVehicleServiceIntervalAction(vehicleId: number, id: number) {
  await requireUser();
  removeVehicleServiceInterval(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function recordServiceDoneAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  recordServiceDone(id, vehicleId, {
    serviceDate: z.string().min(1).parse(str(formData, "serviceDate")),
    serviceOdometer: nullableInt(formData, "serviceOdometer"),
    cost: money(formData, "cost")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
}

/** Marks a reminder done without rolling it forward (e.g. a renewal you are not renewing). */
export async function dismissReminderAction(vehicleId: number, id: number) {
  await requireUser();
  completeReminder(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateVehicle(vehicleId);
  revalidatePath("/reminders");
}
