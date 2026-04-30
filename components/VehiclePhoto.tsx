import { CarFront } from "lucide-react";

export function VehiclePhoto({
  src,
  alt,
  className = ""
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={`vehicle-photo placeholder ${className}`}>
        <CarFront size={36} />
      </div>
    );
  }

  return (
    <div className={`vehicle-photo ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Local optimized uploads are already resized WebP files and must not go through the Next image optimizer auth path. */}
      <img src={src} alt={alt} />
    </div>
  );
}
