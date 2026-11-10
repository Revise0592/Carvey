import { Images } from "lucide-react";
import { deleteGalleryPhotoAction, updateGalleryPhotoAction } from "@/app/actions";
import { GalleryUploadForm } from "@/components/Forms";
import { GalleryGrid, type GalleryItem } from "@/components/GalleryGrid";
import { listAllAttachmentsForVehicle, listMaintenance, listMots, listRepairs, listVehicleGalleryPhotos, type GalleryPhoto, type RecordAttachment } from "@/lib/db";
import { formatDate, formatMotResult } from "@/lib/format";
import { EmptyRecords, type SectionProps } from "./shared";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function GallerySection({ vehicle, settings, query }: SectionProps) {
  const maintenance = listMaintenance(vehicle.id);
  const repairs = listRepairs(vehicle.id);
  const mots = listMots(vehicle.id);
  const imageAttachments = listAllAttachmentsForVehicle(vehicle.id).filter((a) => imageTypes.has(a.mimeType));
  const galleryPhotos = listVehicleGalleryPhotos(vehicle.id);
  const maintenanceMap = new Map(maintenance.map((m) => [m.id, m]));
  const repairsMap = new Map(repairs.map((r) => [r.id, r]));
  const motsMap = new Map(mots.map((m) => [m.id, m]));

  function resolveRecord(recordType: string | null, recordId: number | null) {
    if (recordType === "maintenance" && recordId) {
      const r = maintenanceMap.get(recordId);
      return { description: r?.description ?? "", date: r?.date ?? "", tab: "maintenance" };
    }
    if (recordType === "repair" && recordId) {
      const r = repairsMap.get(recordId);
      return { description: r?.fault ?? "", date: r?.date ?? "", tab: "repairs" };
    }
    if (recordType === "mot" && recordId) {
      const r = motsMap.get(recordId);
      return { description: r ? formatMotResult(r.result) : "", date: r?.testDate ?? "", tab: "mots" };
    }
    if (recordType === "renewal" && recordId) {
      return { description: "Renewal document", date: "", tab: "renewals" };
    }
    return { description: "", date: "", tab: "" };
  }

  type GalleryEntry = { kind: "attachment"; data: RecordAttachment } | { kind: "gallery"; data: GalleryPhoto };
  const entries: GalleryEntry[] = [
    ...imageAttachments.map((data) => ({ kind: "attachment" as const, data })),
    ...galleryPhotos.map((data) => ({ kind: "gallery" as const, data }))
  ].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));

  const items: GalleryItem[] = entries.map((entry) => {
    const { description, date, tab } = resolveRecord(entry.data.recordType ?? null, entry.data.recordId ?? null);
    return {
      id: `${entry.kind}-${entry.data.id}`,
      filePath: entry.data.filePath,
      originalFilename: entry.data.originalFilename,
      caption: entry.kind === "gallery" ? entry.data.caption : null,
      recordType: entry.data.recordType ?? null,
      recordId: entry.data.recordId ?? null,
      recordDescription: description,
      recordDate: date ? formatDate(date, settings) : "",
      recordTab: tab,
      isStandalone: entry.kind === "gallery",
      photoId: entry.kind === "gallery" ? entry.data.id : null
    };
  });

  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><Images size={19} /> Gallery</h2>
        <GalleryUploadForm vehicleId={vehicle.id} maintenance={maintenance} repairs={repairs} autoOpenKey={query.new} />
      </div>
      {items.length ? (
        <GalleryGrid
          items={items}
          vehicleId={vehicle.id}
          deleteAction={deleteGalleryPhotoAction.bind(null, vehicle.id)}
          updateAction={updateGalleryPhotoAction.bind(null, vehicle.id)}
          maintenance={maintenance}
          repairs={repairs}
        />
      ) : (
        <EmptyRecords title="No photos yet">Upload photos directly, or attach images to repair and maintenance records.</EmptyRecords>
      )}
    </section>
  );
}
