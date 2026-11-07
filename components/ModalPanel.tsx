"use client";

import { useCallback, useEffect, useState } from "react";
import { Sheet } from "./Sheet";

export function ModalPanel({
  trigger,
  children,
  title,
  tone = "normal",
  triggerClassName,
  triggerLabel,
  autoOpenKey
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  tone?: "normal" | "danger";
  triggerClassName?: string;
  triggerLabel?: string;
  /** When this changes to a non-empty value (e.g. from a `?new=` URL param), the panel opens. */
  autoOpenKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [handledKey, setHandledKey] = useState<string | undefined>(undefined);
  const close = useCallback(() => setOpen(false), []);

  if (autoOpenKey && autoOpenKey !== handledKey) {
    setHandledKey(autoOpenKey);
    setOpen(true);
  }

  useEffect(() => {
    if (!autoOpenKey) return;
    // Drop the one-shot param so a refresh or back navigation doesn't reopen the form.
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [autoOpenKey]);

  return (
    <>
      <button
        className={triggerClassName ?? `modal-trigger ${tone === "danger" ? "danger-trigger" : ""}`}
        type="button"
        title={triggerLabel}
        aria-label={triggerLabel}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
      <Sheet open={open} onClose={close} title={title}>
        <div onSubmitCapture={() => window.setTimeout(close, 0)}>{children}</div>
      </Sheet>
    </>
  );
}
