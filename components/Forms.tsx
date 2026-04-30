import { CalendarDays, Camera, Check, Gauge, Hammer, ShieldCheck, Wrench } from "lucide-react";
import {
  completeReminderAction,
  createMaintenanceAction,
  createMotAction,
  createReminderAction,
  createRepairAction,
  deleteMaintenanceAction,
  deleteMotAction,
  deleteReminderAction,
  deleteRepairAction,
  updateMaintenanceAction,
  updateMotAction,
  updateReminderAction,
  updateRepairAction
} from "@/app/actions";
import type { MaintenanceRecord, MotRecord, Reminder, RepairRecord } from "@/lib/db";
import { todayIso } from "@/lib/format";

export function VehiclePhotoForm({ vehicleId }: { vehicleId: number }) {
  return (
    <form action={`/vehicles/${vehicleId}/photo`} method="post" encType="multipart/form-data" className="inline-form">
      <label className="file-button">
        <Camera size={17} />
        <span>Update photo</span>
        <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" required />
      </label>
      <button className="secondary-button" type="submit">Upload</button>
    </form>
  );
}

export function EditMaintenanceForm({ record }: { record: MaintenanceRecord }) {
  const updateAction = updateMaintenanceAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMaintenanceAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction}>
      <form action={updateAction} className="record-form">
        <input name="date" type="date" defaultValue={record.date} required />
        <input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} placeholder="Odometer" />
        <input name="category" defaultValue={record.category} placeholder="Category" required />
        <input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} placeholder="Cost" />
        <textarea name="description" defaultValue={record.description} placeholder="What was done?" required />
        <textarea name="notes" defaultValue={record.notes ?? ""} placeholder="Notes" />
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditRepairForm({ record }: { record: RepairRecord }) {
  const updateAction = updateRepairAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteRepairAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction}>
      <form action={updateAction} className="record-form">
        <input name="date" type="date" defaultValue={record.date} required />
        <input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} placeholder="Odometer" />
        <input name="fault" defaultValue={record.fault} placeholder="Fault or repair" required />
        <input name="garage" defaultValue={record.garage ?? ""} placeholder="Garage or vendor" />
        <input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} placeholder="Cost" />
        <textarea name="notes" defaultValue={record.notes ?? ""} placeholder="Notes" />
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditMotForm({ record }: { record: MotRecord }) {
  const updateAction = updateMotAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMotAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction}>
      <form action={updateAction} className="record-form">
        <input name="testDate" type="date" defaultValue={record.testDate} required />
        <input name="expiryDate" type="date" defaultValue={record.expiryDate} required />
        <input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} placeholder="Odometer" />
        <select name="result" defaultValue={record.result} required>
          <option value="pass">Pass</option>
          <option value="advisory">Pass with advisories</option>
          <option value="fail">Fail</option>
        </select>
        <input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} placeholder="Cost" />
        <input name="certificateRef" defaultValue={record.certificateRef ?? ""} placeholder="Certificate/reference" />
        <textarea name="advisories" defaultValue={record.advisories ?? ""} placeholder="Advisories" />
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditReminderForm({ record }: { record: Reminder }) {
  const updateAction = updateReminderAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteReminderAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction}>
      <form action={updateAction} className="record-form">
        <input name="title" defaultValue={record.title} placeholder="Reminder title" required />
        <input name="dueDate" type="date" defaultValue={record.dueDate ?? ""} />
        <input name="dueOdometer" type="number" min="0" defaultValue={record.dueOdometer ?? ""} placeholder="Due mileage" />
        <select name="recurrence" defaultValue={record.recurrence ?? ""}>
          <option value="">No recurrence</option>
          <option value="12 months">Every 12 months</option>
          <option value="6 months">Every 6 months</option>
          <option value="10000 miles">Every 10,000 miles</option>
          <option value="5000 miles">Every 5,000 miles</option>
        </select>
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

function EditPanel({ children, deleteAction }: { children: React.ReactNode; deleteAction: () => Promise<void> }) {
  return (
    <details className="edit-panel">
      <summary>Edit</summary>
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
    </details>
  );
}

export function MaintenanceForm({ vehicleId }: { vehicleId: number }) {
  const action = createMaintenanceAction.bind(null, vehicleId);
  return (
    <details className="entry-panel">
      <summary><Wrench size={17} /> Add maintenance</summary>
      <form action={action} className="record-form">
        <input name="date" type="date" defaultValue={todayIso()} required />
        <input name="odometer" type="number" min="0" placeholder="Odometer" />
        <input name="category" placeholder="Category, e.g. Oil" required />
        <input name="cost" type="number" min="0" step="0.01" placeholder="Cost" />
        <textarea name="description" placeholder="What was done?" required />
        <textarea name="notes" placeholder="Notes" />
        <button className="primary-button" type="submit">Save maintenance</button>
      </form>
    </details>
  );
}

export function RepairForm({ vehicleId }: { vehicleId: number }) {
  const action = createRepairAction.bind(null, vehicleId);
  return (
    <details className="entry-panel">
      <summary><Hammer size={17} /> Add repair</summary>
      <form action={action} className="record-form">
        <input name="date" type="date" defaultValue={todayIso()} required />
        <input name="odometer" type="number" min="0" placeholder="Odometer" />
        <input name="fault" placeholder="Fault or repair" required />
        <input name="garage" placeholder="Garage or vendor" />
        <input name="cost" type="number" min="0" step="0.01" placeholder="Cost" />
        <textarea name="notes" placeholder="Notes" />
        <button className="primary-button" type="submit">Save repair</button>
      </form>
    </details>
  );
}

export function MotForm({ vehicleId }: { vehicleId: number }) {
  const action = createMotAction.bind(null, vehicleId);
  return (
    <details className="entry-panel">
      <summary><ShieldCheck size={17} /> Add MOT</summary>
      <form action={action} className="record-form">
        <input name="testDate" type="date" defaultValue={todayIso()} required />
        <input name="expiryDate" type="date" required />
        <input name="odometer" type="number" min="0" placeholder="Odometer" />
        <select name="result" defaultValue="pass" required>
          <option value="pass">Pass</option>
          <option value="advisory">Pass with advisories</option>
          <option value="fail">Fail</option>
        </select>
        <input name="cost" type="number" min="0" step="0.01" placeholder="Cost" />
        <input name="certificateRef" placeholder="Certificate/reference" />
        <textarea name="advisories" placeholder="Advisories" />
        <button className="primary-button" type="submit">Save MOT</button>
      </form>
    </details>
  );
}

export function ReminderForm({ vehicleId }: { vehicleId: number }) {
  const action = createReminderAction.bind(null, vehicleId);
  return (
    <details className="entry-panel">
      <summary><CalendarDays size={17} /> Add reminder</summary>
      <form action={action} className="record-form">
        <input name="title" placeholder="Reminder title" required />
        <input name="dueDate" type="date" />
        <input name="dueOdometer" type="number" min="0" placeholder="Due mileage" />
        <select name="recurrence" defaultValue="">
          <option value="">No recurrence</option>
          <option value="12 months">Every 12 months</option>
          <option value="6 months">Every 6 months</option>
          <option value="10000 miles">Every 10,000 miles</option>
          <option value="5000 miles">Every 5,000 miles</option>
        </select>
        <button className="primary-button" type="submit">Save reminder</button>
      </form>
    </details>
  );
}

export function CompleteReminderButton({ vehicleId, id }: { vehicleId: number; id: number }) {
  const action = completeReminderAction.bind(null, vehicleId);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="icon-button" type="submit" title="Mark complete" aria-label="Mark complete">
        <Check size={17} />
      </button>
    </form>
  );
}

export function MileagePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="pill">
      <Gauge size={14} />
      {children}
    </span>
  );
}
