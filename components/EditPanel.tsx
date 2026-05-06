import { ModalPanel } from "./ModalPanel";

export function EditPanel({
  children,
  deleteAction,
  title = "Edit entry"
}: {
  children: React.ReactNode;
  deleteAction: () => Promise<void>;
  title?: string;
}) {
  return (
    <ModalPanel trigger="Edit" title={title}>
      <div className="edit-menu">
        {children}
        <form action={deleteAction} className="delete-confirm">
          <label>
            <input type="checkbox" required />
            Confirm delete
          </label>
          <button className="danger-button" type="submit">Delete entry</button>
        </form>
      </div>
    </ModalPanel>
  );
}
