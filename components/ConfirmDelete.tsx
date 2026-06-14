"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

export function ConfirmDelete({
  action,
  label = "Delete"
}: {
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="confirm-delete-prompt">
        <span>Are you sure?</span>
        <form action={action}>
          <input type="hidden" name="confirmed" value="on" />
          <button className="danger-button" type="submit">Yes</button>
        </form>
        <button className="secondary-button" type="button" onClick={() => setConfirming(false)}>No</button>
      </div>
    );
  }

  return (
    <button className="danger-button confirm-delete-trigger" type="button" onClick={() => setConfirming(true)}>
      <Trash2 size={17} /> {label}
    </button>
  );
}
