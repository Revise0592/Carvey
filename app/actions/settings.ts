"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { activateShowcaseDemoData, restorePreviousDebugDemoData, saveCurrentDataAsShowcaseDemo } from "@/lib/backup";
import { createMaintenanceCategory, createServiceInterval, createWorkshop, deleteMaintenanceCategory, deleteServiceInterval, deleteWorkshop, updateCollectionName, updateMaintenanceCategory, updateServiceInterval, updateWorkshop } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CURRENCY_CODES, updateRegionalSettings } from "@/lib/regional-settings";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { debugSettingsUrl, nullableInt, nullableStr, str, syncCurrentDemoAfterMutation, workshopInput } from "./shared";

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

export async function createServiceIntervalAction(formData: FormData) {
  await requireUser();
  createServiceInterval({
    name: z.string().min(1).max(100).parse(str(formData, "name")),
    intervalMonths: nullableInt(formData, "intervalMonths"),
    intervalMileage: nullableInt(formData, "intervalMileage")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=service-intervals&interval=created");
}

export async function updateServiceIntervalAction(intervalId: number, formData: FormData) {
  await requireUser();
  updateServiceInterval(intervalId, {
    name: z.string().min(1).max(100).parse(str(formData, "name")),
    intervalMonths: nullableInt(formData, "intervalMonths"),
    intervalMileage: nullableInt(formData, "intervalMileage")
  });
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=service-intervals&interval=updated");
}

export async function deleteServiceIntervalAction(intervalId: number, formData: FormData) {
  await requireUser();
  if (str(formData, "confirmed") !== "on") return;
  deleteServiceInterval(intervalId);
  await syncCurrentDemoAfterMutation();
  revalidatePath("/settings");
  redirect("/settings?tab=service-intervals&interval=deleted");
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
  const currency = z.string().refine(code => CURRENCY_CODES.includes(code)).parse(str(formData, "currency"));
  const fuelVolumeUnit = z.enum(["litres", "gallons"]).parse(str(formData, "fuelVolumeUnit"));
  const motFeature = z.enum(["mot", "inspection", "custom", "disabled"]).parse(str(formData, "motFeature"));
  const motCustomLabel = nullableStr(formData, "motCustomLabel") ?? "";
  const dateFormat = z.enum(["dd-mon-yyyy", "iso"]).parse(str(formData, "dateFormat"));
  const distanceUnit = z.enum(["miles", "km"]).parse(str(formData, "distanceUnit"));
  const plateStyle = z.enum(["uk-yellow", "uk-white"]).parse(str(formData, "plateStyle"));
  const fuelDisabled = str(formData, "fuelDisabled") === "on";
  updateRegionalSettings({ currency, fuelVolumeUnit, motFeature, motCustomLabel, dateFormat, distanceUnit, plateStyle, fuelDisabled });
  revalidatePath("/");
  redirect("/settings?tab=regional&app=regional-updated");
}

