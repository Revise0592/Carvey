"use client";

import { Plus } from "lucide-react";
import type { MaintenanceRecord, RepairRecord } from "@/lib/db/types";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

export function GalleryUploadForm({
  vehicleId,
  maintenance,
  repairs,
  autoOpenKey,
}: {
  vehicleId: number;
  maintenance: MaintenanceRecord[];
  repairs: RepairRecord[];
  autoOpenKey?: string;
}) {
  return (
    <ModalPanel trigger={<><Plus size={17} /> Add photo</>} title="Add photo to gallery" autoOpenKey={autoOpenKey}>
      <form action="/api/gallery-photos" method="post" encType="multipart/form-data" className="record-form">
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <Field label="Photo">
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
        </Field>
        <Field label="Caption">
          <input name="caption" type="text" placeholder="Optional caption" />
        </Field>
        <Field label="Link to record (optional)">
          <select name="recordType" defaultValue="">
            <option value="">— Not linked —</option>
            {maintenance.length > 0 ? (
              <optgroup label="Maintenance">
                {maintenance.map(r => (
                  <option key={r.id} value={`maintenance:${r.id}`}>{r.date} · {r.description}</option>
                ))}
              </optgroup>
            ) : null}
            {repairs.length > 0 ? (
              <optgroup label="Repairs">
                {repairs.map(r => (
                  <option key={r.id} value={`repair:${r.id}`}>{r.date} · {r.fault}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </Field>
        <button className="primary-button" type="submit">Upload photo</button>
      </form>
    </ModalPanel>
  );
}
