"use server";

import { z } from "zod";
import { deleteAttachment, deleteGalleryPhoto, getAttachment, getGalleryPhoto, updateGalleryPhoto } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { galleryRecordTypeSchema, nullableStr, removeUploadFile, revalidateVehicle, str } from "./shared";

export async function deleteAttachmentAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const attachmentId = z.coerce.number().int().positive().parse(str(formData, "attachmentId"));
  const attachment = getAttachment(attachmentId, vehicleId);
  if (!attachment) return;
  deleteAttachment(attachmentId, vehicleId);
  await removeUploadFile(attachment.filePath);
  revalidateVehicle(vehicleId);
}

export async function deleteGalleryPhotoAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const photoId = z.coerce.number().int().positive().parse(str(formData, "photoId"));
  const photo = getGalleryPhoto(photoId, vehicleId);
  if (!photo) return;
  deleteGalleryPhoto(photoId, vehicleId);
  await removeUploadFile(photo.filePath);
  revalidateVehicle(vehicleId);
}

export async function updateGalleryPhotoAction(vehicleId: number, formData: FormData) {
  await requireUser();
  const photoId = z.coerce.number().int().positive().parse(str(formData, "photoId"));
  const photo = getGalleryPhoto(photoId, vehicleId);
  if (!photo) return;
  const caption = nullableStr(formData, "caption");
  // recordType field may be "maintenance:42", "repair:7", or "" (unlinked)
  const rawLinked = str(formData, "recordType") || "";
  const [rawType, rawId] = rawLinked.includes(":") ? rawLinked.split(":") : [null, null];
  const recordType = galleryRecordTypeSchema.parse(rawType || null);
  const recordId = rawId ? Number.parseInt(rawId, 10) : null;
  updateGalleryPhoto(photoId, vehicleId, { caption, recordType, recordId });
  revalidateVehicle(vehicleId);
}
