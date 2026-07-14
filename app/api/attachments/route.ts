import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAttachment } from "@/lib/db";
import { attachmentDir } from "@/lib/paths";
import { z } from "zod";

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);

const maxFileBytes = 25 * 1024 * 1024;

const recordTypeSchema = z.enum(["maintenance", "repair", "mot"]);

export async function POST(request: Request) {
  await requireUser();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Could not read upload", { status: 400 });
  }

  const vehicleId = Number.parseInt(formData.get("vehicleId") as string, 10);
  const recordType = recordTypeSchema.safeParse(formData.get("recordType"));
  const recordId = Number.parseInt(formData.get("recordId") as string, 10);
  const file = formData.get("file");

  if (!vehicleId || !recordType.success || !recordId) {
    return new NextResponse("Invalid parameters", { status: 400 });
  }
  if (!(file instanceof File) || !file.size) {
    return new NextResponse("Choose a file to attach", { status: 400 });
  }
  if (!allowedMimeTypes.has(file.type)) {
    return new NextResponse("File type not allowed. Use PDF, JPEG, PNG, WebP, or plain text.", { status: 400 });
  }
  if (file.size > maxFileBytes) {
    return new NextResponse("File must be smaller than 25 MB.", { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase() || extensionFromMime(file.type);
  const storedFilename = `${vehicleId}-${crypto.randomUUID()}${ext}`;
  const vehicleAttachmentDir = path.join(attachmentDir, String(vehicleId));

  await fs.mkdir(vehicleAttachmentDir, { recursive: true });
  const diskPath = path.join(vehicleAttachmentDir, storedFilename);
  await fs.writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

  createAttachment({
    recordType: recordType.data,
    recordId,
    vehicleId,
    filename: storedFilename,
    originalFilename: file.name,
    mimeType: file.type,
    fileSize: file.size,
    filePath: `/uploads/attachments/${vehicleId}/${storedFilename}`
  });

  revalidatePath(`/vehicles/${vehicleId}`);
  const tab = tabForRecordType(recordType.data);
  const location = `/vehicles/${vehicleId}?tab=${tab}#attachments-${recordType.data}-${recordId}`;
  return new Response(null, { status: 303, headers: { Location: location } });
}

function tabForRecordType(recordType: "maintenance" | "repair" | "mot") {
  const map = { maintenance: "maintenance", repair: "repairs", mot: "mots" } as const;
  return map[recordType];
}

function extensionFromMime(mime: string) {
  const map: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "text/plain": ".txt"
  };
  return map[mime] ?? "";
}
