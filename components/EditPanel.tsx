"use client";

import { ConfirmDelete } from "./ConfirmDelete";
import { ModalPanel } from "./ModalPanel";

export function EditPanel({
  children,
  deleteAction,
  title = "Edit entry"
}: {
  children: React.ReactNode;
  deleteAction: (formData: FormData) => unknown;
  title?: string;
}) {
  return (
    <ModalPanel trigger="Edit" title={title}>
      <div className="edit-menu">
        {children}
        <ConfirmDelete action={deleteAction} />
      </div>
    </ModalPanel>
  );
}
