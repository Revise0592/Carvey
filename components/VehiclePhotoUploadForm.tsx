"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";

export function VehiclePhotoUploadForm({ vehicleId }: { vehicleId: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <form ref={formRef} action={`/vehicles/${vehicleId}/photo`} method="post" encType="multipart/form-data">
      <label className="file-button">
        <Camera size={17} />
        <span>{uploading ? "Uploading..." : "Update photo"}</span>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          disabled={uploading}
          required
          onChange={(event) => {
            if (!event.currentTarget.files?.length) return;
            setUploading(true);
            formRef.current?.requestSubmit();
          }}
        />
      </label>
    </form>
  );
}
