"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRenewal, deleteRenewal, listAndDeleteAttachmentsForRecord, updateRenewal, RENEWAL_TYPES } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, nullableStr, removeUploadFile, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function renewalInput(formData: FormData) {
  return {
    type: z.enum(RENEWAL_TYPES).parse(str(formData, "type")),
    provider: nullableStr(formData, "provider"),
    reference: nullableStr(formData, "reference"),
    startDate: isoDate.nullable().parse(nullableStr(formData, "startDate")),
    endDate: isoDate.parse(str(formData, "endDate")),
    cost: money(formData, "cost"),
    notes: nullableStr(formData, "notes")
  };
}

function revalidateRenewals(vehicleId: number) {
  revalidateVehicle(vehicleId);
  revalidatePath("/reminders");
  revalidatePath("/costs");
}

export async function createRenewalAction(vehicleId: number, formData: FormData) {
  await requireUser();
  createRenewal({ vehicleId, ...renewalInput(formData) });
  await syncCurrentDemoAfterMutation();
  revalidateRenewals(vehicleId);
}

export async function updateRenewalAction(vehicleId: number, id: number, formData: FormData) {
  await requireUser();
  updateRenewal(id, vehicleId, renewalInput(formData));
  await syncCurrentDemoAfterMutation();
  revalidateRenewals(vehicleId);
}

export async function deleteRenewalAction(vehicleId: number, id: number) {
  await requireUser();
  const orphaned = listAndDeleteAttachmentsForRecord("renewal", id);
  for (const attachment of orphaned) await removeUploadFile(attachment.filePath);
  deleteRenewal(id, vehicleId);
  await syncCurrentDemoAfterMutation();
  revalidateRenewals(vehicleId);
}
