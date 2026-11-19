import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAttachment, recordBelongsToVehicle } from "@/lib/db";
import { z } from "zod";
import { rejectCrossOrigin } from "@/lib/security/request";
import { contentMatchesMime, extensionForMime, storeVehicleUpload } from "@/lib/uploads";

const maxFileBytes = 25 * 1024 * 1024;

const recordTypeSchema = z.enum(["maintenance", "repair", "mot", "renewal"]);

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
  const recordType = recordTypeSchema.safeParse(formData.get("recordType"));
  const recordId = Number.parseInt(formData.get("recordId") as string, 10);
  const file = formData.get("file");

  if (!vehicleId || !recordType.success || !recordId) {
    return new NextResponse("Invalid parameters", { status: 400 });
  }
  if (!recordBelongsToVehicle(recordType.data, recordId, vehicleId)) {
    return new NextResponse("Record not found", { status: 404 });
  }
  if (!(file instanceof File) || !file.size) {
    return new NextResponse("Choose a file to attach", { status: 400 });
  }
  if (!extensionForMime(file.type)) {
    return new NextResponse("File type not allowed. Use PDF, JPEG, PNG, WebP, or plain text.", { status: 400 });
  }
  if (file.size > maxFileBytes) {
    return new NextResponse("File must be smaller than 25 MB.", { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!contentMatchesMime(bytes, file.type)) {
    return new NextResponse("The file's contents don't match its type.", { status: 400 });
  }

  await storeVehicleUpload(vehicleId, file.type, bytes, ({ filename, filePath }) =>
    createAttachment({
      recordType: recordType.data,
      recordId,
      vehicleId,
      filename,
      originalFilename: file.name.slice(0, 255),
      mimeType: file.type,
      fileSize: file.size,
      filePath
    })
  );

  revalidatePath(`/vehicles/${vehicleId}`);
  const tab = tabForRecordType(recordType.data);
  const location = `/vehicles/${vehicleId}?tab=${tab}#attachments-${recordType.data}-${recordId}`;
  return new Response(null, { status: 303, headers: { Location: location } });
}

function tabForRecordType(recordType: z.infer<typeof recordTypeSchema>) {
  const map = { maintenance: "maintenance", repair: "repairs", mot: "mots", renewal: "renewals" } as const;
  return map[recordType];
}
