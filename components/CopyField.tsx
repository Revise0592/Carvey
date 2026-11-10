"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A read-only value with a copy button, e.g. a calendar subscription link. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-field">
      <input readOnly value={value} aria-label={label} onFocus={(event) => event.currentTarget.select()} />
      <button
        type="button"
        className="icon-button"
        aria-label={`Copy ${label.toLowerCase()}`}
        title="Copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard access can be blocked on plain-http origins; the field stays selectable.
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
