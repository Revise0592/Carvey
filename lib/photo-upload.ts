import { getVehicle, setVehiclePhoto } from "./db";
import { optimizeVehiclePhoto } from "./images";

export async function processVehiclePhotoUpload(vehicleId: number, file: File) {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) {
    return { ok: false as const, status: 404, message: "Vehicle not found" };
  }
  if (file.size === 0) {
    return { ok: false as const, status: 400, message: "Choose an image to upload" };
  }

  try {
    const image = await optimizeVehiclePhoto(file, vehicleId);
    setVehiclePhoto(vehicleId, image.photoPath, image.thumbnailPath);
    return { ok: true as const, image };
  } catch (error) {
    return {
      ok: false as const,
      status: 400,
      message: error instanceof Error ? error.message : "Could not process image"
    };
  }
}
