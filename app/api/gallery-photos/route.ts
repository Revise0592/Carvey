import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createGalleryPhoto } from "@/lib/db";
import { attachmentDir } from "@/lib/paths";
import { z } from "zod";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileBytes = 25 * 1024 * 1024;
const recordTypeSchema = z.enum(["maintenance", "repair", "mot"]).nullable();

export async function POST(request: Request) {
  await requireUser();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Could not read upload", { status: 400 });
  }

  const vehicleId = Number.parseInt(formData.get("vehicleId") as string, 10);
  if (!vehicleId) return new NextResponse("Invalid vehicle", { status: 400 });

  // recordType field may be "maintenance:42", "repair:7", or "" (unlinked)
  const rawLinked = (formData.get("recordType") as string | null) || "";
  const [rawType, rawId] = rawLinked.includes(":") ? rawLinked.split(":") : [null, null];
  const recordType = recordTypeSchema.safeParse(rawType || null);
  const recordId = rawId ? Number.parseInt(rawId, 10) : null;
  const caption = (formData.get("caption") as string | null)?.trim() || null;

  if (!recordType.success) return new NextResponse("Invalid record type", { status: 400 });

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

  const ext = path.extname(file.name).toLowerCase() || extensionFromMime(file.type);
  const storedFilename = `${vehicleId}-${crypto.randomUUID()}${ext}`;
  const vehicleAttachmentDir = path.join(attachmentDir, String(vehicleId));

  await fs.mkdir(vehicleAttachmentDir, { recursive: true });
  await fs.writeFile(path.join(vehicleAttachmentDir, storedFilename), Buffer.from(await file.arrayBuffer()));

  createGalleryPhoto({
    vehicleId,
    recordType: recordType.data,
    recordId: recordType.data && recordId ? recordId : null,
    filename: storedFilename,
    originalFilename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    filePath: `/uploads/attachments/${vehicleId}/${storedFilename}`,
    caption,
  });

  revalidatePath(`/vehicles/${vehicleId}`);
  return new Response(null, { status: 303, headers: { Location: `/vehicles/${vehicleId}?tab=gallery` } });
}

function extensionFromMime(mime: string) {
  const map: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
  return map[mime] ?? "";
}
