import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { syncShowcaseDemoBackupIfActive } from "@/lib/backup";
import { processVehiclePhotoUpload } from "@/lib/photo-upload";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const vehicleId = Number.parseInt(id, 10);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Could not read upload", { status: 400 });
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return new NextResponse("Choose an image to upload", { status: 400 });
  }

  const result = await processVehiclePhotoUpload(vehicleId, file);
  if (!result.ok) return new NextResponse(result.message, { status: result.status });

  await syncShowcaseDemoBackupIfActive();
  revalidatePath("/garage");
  revalidatePath(`/vehicles/${vehicleId}`);
  return new Response(null, { status: 303, headers: { Location: `/vehicles/${vehicleId}` } });
}
