"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function ModalPanel({
  trigger,
  children,
  title,
  tone = "normal"
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  tone?: "normal" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const titleId = title ? `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;

  return (
    <>
      <button className={`modal-trigger ${tone === "danger" ? "danger-trigger" : ""}`} type="button" onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmitCapture={() => window.setTimeout(() => setOpen(false), 0)}
          >
            <div className="modal-chrome">
              <button className="modal-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {title ? <h2 id={titleId} className="modal-title">{title}</h2> : null}
              {children}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
