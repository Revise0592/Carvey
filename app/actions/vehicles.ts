"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createVehicle, deleteVehicle, getVehicle, setVehicleDebugDestroyed, updateVehicle } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { nullableInt, nullableMoney, nullableStr, removeUploadFile, revalidateVehicle, str, syncCurrentDemoAfterMutation } from "./shared";

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
