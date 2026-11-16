import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createGalleryPhoto, getVehicle, recordBelongsToVehicle } from "@/lib/db";
import { z } from "zod";
import { rejectCrossOrigin } from "@/lib/security/request";
import { contentMatchesMime, storeVehicleUpload } from "@/lib/uploads";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileBytes = 25 * 1024 * 1024;
const recordTypeSchema = z.enum(["maintenance", "repair", "mot"]).nullable();

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  await requireUser();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Could not read upload", { status: 400 });
  }

  const vehicleId = Number.parseInt(formData.get("vehicleId") as string, 10);
  if (!vehicleId) return new NextResponse("Invalid vehicle", { status: 400 });
  if (!getVehicle(vehicleId)) return new NextResponse("Vehicle not found", { status: 404 });

  // recordType field may be "maintenance:42", "repair:7", or "" (unlinked)
  const rawLinked = (formData.get("recordType") as string | null) || "";
  const [rawType, rawId] = rawLinked.includes(":") ? rawLinked.split(":") : [null, null];
  const recordType = recordTypeSchema.safeParse(rawType || null);
  const recordId = rawId ? Number.parseInt(rawId, 10) : null;
  const caption = (formData.get("caption") as string | null)?.trim().slice(0, 500) || null;

  if (!recordType.success) return new NextResponse("Invalid record type", { status: 400 });
  const linkedRecordId = recordType.data && recordId ? recordId : null;
  if (recordType.data && linkedRecordId && !recordBelongsToVehicle(recordType.data, linkedRecordId, vehicleId)) {
    return new NextResponse("Record not found", { status: 404 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) {
    return new NextResponse("Choose an image to upload", { status: 400 });
  }
  if (!allowedMimeTypes.has(file.type)) {
    return new NextResponse("Only JPEG, PNG, and WebP images are supported.", { status: 400 });
  }
  if (file.size > maxFileBytes) {
    return new NextResponse("File must be smaller than 25 MB.", { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!contentMatchesMime(bytes, file.type)) {
    return new NextResponse("That file isn't a valid JPEG, PNG or WebP image.", { status: 400 });
  }

  await storeVehicleUpload(vehicleId, file.type, bytes, ({ filename, filePath }) =>
    createGalleryPhoto({
      vehicleId,
      recordType: linkedRecordId ? recordType.data : null,
      recordId: linkedRecordId,
      filename,
      originalFilename: file.name.slice(0, 255),
      mimeType: file.type,
      fileSize: file.size,
      filePath,
      caption
    })
  );

  revalidatePath(`/vehicles/${vehicleId}`);
  return new Response(null, { status: 303, headers: { Location: `/vehicles/${vehicleId}?tab=gallery` } });
}
