import { ModalPanel } from "./ModalPanel";

export function EditPanel({
  children,
  deleteAction
}: {
  children: React.ReactNode;
  deleteAction: () => Promise<void>;
}) {
  return (
    <ModalPanel trigger="Edit">
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
