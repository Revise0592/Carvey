"use client";

import { useRef } from "react";

export function EditPanel({
  children,
  deleteAction
}: {
  children: React.ReactNode;
  deleteAction: () => Promise<void>;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closePanel() {
    window.setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = false;
    }, 0);
  }

  return (
    <details className="edit-panel" ref={detailsRef}>
      <summary>Edit</summary>
      <div className="edit-menu" onSubmit={closePanel}>
        {children}
        <form action={deleteAction} className="delete-confirm">
          <label>
            <input type="checkbox" required />
            Confirm delete
          </label>
          <button className="danger-button" type="submit">Delete entry</button>
        </form>
      </div>
    </details>
  );
}
