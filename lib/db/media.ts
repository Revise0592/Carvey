import { getDb } from "./connection";
import type { AttachmentRecordType, GalleryPhoto, RecordAttachment } from "./types";

const attachmentSelect = `
  id,
  record_type as recordType,
  record_id as recordId,
  vehicle_id as vehicleId,
  filename,
  original_filename as originalFilename,
  mime_type as mimeType,
  file_size as fileSize,
  file_path as filePath,
  created_at as createdAt
`;

export function listAllAttachmentsForVehicle(vehicleId: number): RecordAttachment[] {
  return getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE vehicle_id = ? ORDER BY created_at DESC`)
    .all(vehicleId) as RecordAttachment[];
}

/** One query for every attachment of a record type on a vehicle, keyed by record id. */
export function groupAttachmentsByRecord(vehicleId: number, recordType: AttachmentRecordType) {
  const rows = getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE vehicle_id = ? AND record_type = ? ORDER BY id`)
    .all(vehicleId, recordType) as RecordAttachment[];
  const grouped = new Map<number, RecordAttachment[]>();
  for (const row of rows) {
    const list = grouped.get(row.recordId);
    if (list) list.push(row);
    else grouped.set(row.recordId, [row]);
  }
  return grouped;
}

export function listAttachments(recordType: string, recordId: number): RecordAttachment[] {
  return getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE record_type = ? AND record_id = ? ORDER BY id`)
    .all(recordType, recordId) as RecordAttachment[];
}

export function getAttachment(id: number, vehicleId: number): RecordAttachment | null {
  return (getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as RecordAttachment | undefined) ?? null;
}

export function getAttachmentByFilename(filename: string): RecordAttachment | null {
  return (getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE filename = ?`)
    .get(filename) as RecordAttachment | undefined) ?? null;
}

export function createAttachment(input: Omit<RecordAttachment, "id" | "createdAt">) {
  return getDb()
    .prepare(`
      INSERT INTO record_attachments (record_type, record_id, vehicle_id, filename, original_filename, mime_type, file_size, file_path)
      VALUES (@recordType, @recordId, @vehicleId, @filename, @originalFilename, @mimeType, @fileSize, @filePath)
    `)
    .run(input);
}

export function deleteAttachment(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM record_attachments WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}

export function listAndDeleteAttachmentsForRecord(recordType: string, recordId: number): RecordAttachment[] {
  const attachments = getDb()
    .prepare(`SELECT ${attachmentSelect} FROM record_attachments WHERE record_type = ? AND record_id = ?`)
    .all(recordType, recordId) as RecordAttachment[];
  if (attachments.length) {
    getDb()
      .prepare("DELETE FROM record_attachments WHERE record_type = ? AND record_id = ?")
      .run(recordType, recordId);
  }
  return attachments;
}

// ─── Gallery photos ─────────────────────────────────────────────────────────

const galleryPhotoSelect = `
  id,
  vehicle_id as vehicleId,
  record_type as recordType,
  record_id as recordId,
  filename,
  original_filename as originalFilename,
  mime_type as mimeType,
  file_size as fileSize,
  file_path as filePath,
  caption,
  created_at as createdAt
`;

export function listVehicleGalleryPhotos(vehicleId: number): GalleryPhoto[] {
  return getDb()
    .prepare(`SELECT ${galleryPhotoSelect} FROM vehicle_gallery_photos WHERE vehicle_id = ? ORDER BY created_at DESC`)
    .all(vehicleId) as GalleryPhoto[];
}

export function getGalleryPhoto(id: number, vehicleId: number): GalleryPhoto | null {
  return (getDb()
    .prepare(`SELECT ${galleryPhotoSelect} FROM vehicle_gallery_photos WHERE id = ? AND vehicle_id = ?`)
    .get(id, vehicleId) as GalleryPhoto | undefined) ?? null;
}

export function createGalleryPhoto(input: Omit<GalleryPhoto, "id" | "createdAt">) {
  return getDb()
    .prepare(`
      INSERT INTO vehicle_gallery_photos (vehicle_id, record_type, record_id, filename, original_filename, mime_type, file_size, file_path, caption)
      VALUES (@vehicleId, @recordType, @recordId, @filename, @originalFilename, @mimeType, @fileSize, @filePath, @caption)
    `)
    .run(input);
}

export function updateGalleryPhoto(id: number, vehicleId: number, input: { caption: string | null; recordType: GalleryPhoto["recordType"]; recordId: number | null }) {
  return getDb()
    .prepare("UPDATE vehicle_gallery_photos SET caption = @caption, record_type = @recordType, record_id = @recordId WHERE id = @id AND vehicle_id = @vehicleId")
    .run({ id, vehicleId, ...input });
}

export function deleteGalleryPhoto(id: number, vehicleId: number) {
  return getDb()
    .prepare("DELETE FROM vehicle_gallery_photos WHERE id = ? AND vehicle_id = ?")
    .run(id, vehicleId);
}
