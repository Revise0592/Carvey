"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";

export type GalleryItem = {
  id: string;
  filePath: string;
  originalFilename: string;
  caption: string | null;
  recordType: string | null;
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
}: {
  items: GalleryItem[];
  vehicleId: number;
  deleteAction: (formData: FormData) => Promise<void>;
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
                <form action={deleteAction} style={{ marginTop: "0.25rem" }}>
                  <input type="hidden" name="photoId" value={item.photoId} />
                  <button type="submit" className="icon-button gallery-delete-btn" title="Delete photo">
                    <Trash2 size={13} />
                  </button>
                </form>
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
