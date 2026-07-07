"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { EditPanel } from "./EditPanel";
import type { MaintenanceRecord, RepairRecord } from "@/lib/db";

export type GalleryItem = {
  id: string;
  filePath: string;
  originalFilename: string;
  caption: string | null;
  recordType: string | null;
  recordId: number | null;
  recordDescription: string;
  recordDate: string;
  recordTab: string;
  isStandalone: boolean;
  photoId: number | null;
};

export function GalleryGrid({
  items,
  vehicleId,
  deleteAction,
  updateAction,
  maintenance,
  repairs,
}: {
  items: GalleryItem[];
  vehicleId: number;
  deleteAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  maintenance: MaintenanceRecord[];
  repairs: RepairRecord[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => setOpen(null), []);
  const prev = useCallback(
    () => setOpen((i) => (i !== null ? (i - 1 + items.length) % items.length : null)),
    [items.length]
  );
  const next = useCallback(
    () => setOpen((i) => (i !== null ? (i + 1) % items.length : null)),
    [items.length]
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [close]);

  useEffect(() => {
    if (open === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, prev, next]);

  const current = open !== null ? items[open] : null;

  return (
    <>
      <div className="gallery-grid">
        {items.map((item, idx) => (
          <div className="gallery-card" key={item.id}>
            <button
              type="button"
              className="gallery-thumb-link"
              onClick={() => setOpen(idx)}
              aria-label={`View ${item.caption || item.recordDescription || item.originalFilename}`}
            >
              <img
                src={item.filePath}
                alt={item.caption || item.recordDescription || item.originalFilename}
                className="gallery-thumb"
                loading="lazy"
              />
            </button>
            <div className="gallery-card-meta">
              {item.recordType ? <span className="tag tag-neutral" style={{ textTransform: "capitalize" }}>{item.recordType}</span> : null}
              {item.caption || item.recordDescription ? (
                <strong>{item.caption || item.recordDescription}</strong>
              ) : null}
              {item.recordDate ? <p className="record-row-meta">{item.recordDate}</p> : null}
              {item.recordTab ? (
                <Link href={`/vehicles/${vehicleId}?tab=${item.recordTab}`} className="gallery-record-link">
                  View Record →
                </Link>
              ) : null}
              {item.isStandalone && item.photoId !== null ? (
                <div style={{ marginTop: "0.25rem" }}>
                  <EditPanel
                    title="Edit photo"
                    deleteAction={async (formData) => {
                      formData.append("photoId", String(item.photoId));
                      await deleteAction(formData);
                    }}
                  >
                    <form
                      action={async (formData) => {
                        formData.append("photoId", String(item.photoId));
                        await updateAction(formData);
                      }}
                      className="record-form"
                    >
                      <label className="form-field">
                        <span>Caption</span>
                        <input name="caption" type="text" defaultValue={item.caption ?? ""} placeholder="Optional caption" />
                      </label>
                      <label className="form-field">
                        <span>Link to record (optional)</span>
                        <select name="recordType" defaultValue={item.recordType && item.recordId ? `${item.recordType}:${item.recordId}` : ""}>
                          <option value="">— Not linked —</option>
                          {maintenance.length > 0 ? (
                            <optgroup label="Maintenance">
                              {maintenance.map(m => (
                                <option key={m.id} value={`maintenance:${m.id}`}>{m.date} · {m.description}</option>
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
                      </label>
                      <button className="primary-button" type="submit">Save changes</button>
                    </form>
                  </EditPanel>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="gallery-lightbox"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {current ? (
          <div className="gallery-lightbox-inner">
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={close}
              aria-label="Close lightbox"
            >
              <X size={20} />
            </button>
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="gallery-lightbox-nav gallery-lightbox-prev"
                  onClick={prev}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  className="gallery-lightbox-nav gallery-lightbox-next"
                  onClick={next}
                  aria-label="Next photo"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            ) : null}
            <img
              src={current.filePath}
              alt={current.caption || current.recordDescription || current.originalFilename}
              className="gallery-lightbox-img"
            />
            {current.caption || current.recordDescription || current.recordDate ? (
              <p className="gallery-lightbox-caption">
                {current.caption || current.recordDescription || null}
                {current.recordDate
                  ? `${current.caption || current.recordDescription ? " · " : ""}${current.recordDate}`
                  : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
