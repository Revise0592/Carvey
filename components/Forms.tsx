import { CalendarDays, Check, Gauge, Hammer, PackagePlus, Plus, ShieldCheck, ShoppingCart, Trash2, Wrench } from "lucide-react";
import {
  completeReminderAction,
  createMaintenanceFromPurchaseAction,
  createPlannedPurchaseAction,
  createVehicleAction,
  createMaintenanceAction,
  createMotAction,
  createReminderAction,
  createRepairFromPurchaseAction,
  createRepairAction,
  deletePlannedPurchaseAction,
  deleteVehicleAction,
  deleteMaintenanceAction,
  deleteMotAction,
  deleteReminderAction,
  deleteRepairAction,
  markPlannedPurchaseBoughtAction,
  updateVehicleDebugAction,
  updateMaintenanceAction,
  updateMotAction,
  updatePlannedPurchaseAction,
  updateReminderAction,
  updateRepairAction,
  updateVehicleAction
} from "@/app/actions";
import type { MaintenanceCategory, MaintenanceRecord, MotRecord, PlannedPurchase, Reminder, RepairRecord, Vehicle, Workshop } from "@/lib/db";
import { todayIso } from "@/lib/format";
import { EditPanel } from "./EditPanel";
import { ModalPanel } from "./ModalPanel";

export function CreateVehicleForm() {
  return (
    <ModalPanel trigger={<><Plus size={17} /> Add vehicle</>} title="Add vehicle">
      <form action={createVehicleAction} className="record-form">
        <Field label="Make"><input name="make" required /></Field>
        <Field label="Model"><input name="model" required /></Field>
        <Field label="Year"><input name="year" type="number" min="1886" max="2100" /></Field>
        <Field label="Registration"><input name="registration" required /></Field>
        <Field label="VIN"><input name="vin" /></Field>
        <Field label="Current mileage"><input name="currentOdometer" type="number" min="0" /></Field>
        <Field label="Purchase price"><input name="purchasePrice" type="number" min="0" step="0.01" /></Field>
        <Field label="Purchase date"><input name="purchaseDate" type="date" /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Create vehicle</button>
      </form>
    </ModalPanel>
  );
}

export function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const updateAction = updateVehicleAction.bind(null, vehicle.id);
  const deleteAction = deleteVehicleAction.bind(null, vehicle.id);
  return (
    <ModalPanel trigger="Edit car" title="Edit car">
      <form action={updateAction} className="record-form">
        <Field label="Make"><input name="make" defaultValue={vehicle.make} required /></Field>
        <Field label="Model"><input name="model" defaultValue={vehicle.model} required /></Field>
        <Field label="Year"><input name="year" type="number" min="1886" max="2100" defaultValue={vehicle.year ?? ""} /></Field>
        <Field label="Registration"><input name="registration" defaultValue={vehicle.registration} required /></Field>
        <Field label="VIN"><input name="vin" defaultValue={vehicle.vin ?? ""} /></Field>
        <Field label="Current mileage"><input name="currentOdometer" type="number" min="0" defaultValue={vehicle.currentOdometer ?? ""} /></Field>
        <Field label="Purchase price"><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={vehicle.purchasePrice ?? ""} /></Field>
        <Field label="Purchase date"><input name="purchaseDate" type="date" defaultValue={vehicle.purchaseDate ?? ""} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={vehicle.notes ?? ""} /></Field>
        <label className="checkbox-field">
          <input name="sold" type="checkbox" defaultChecked={Boolean(vehicle.sold)} />
          Mark as sold
        </label>
        <button className="primary-button" type="submit">Save car</button>
      </form>
      <hr className="modal-divider" />
      <form action={deleteAction} className="delete-confirm destructive-form">
        <p className="muted">This removes {vehicle.make} {vehicle.model} and all of its logs.</p>
        <label>
          <input type="checkbox" name="confirmed" required />
          Confirm delete
        </label>
        <button className="danger-button" type="submit"><Trash2 size={17} /> Delete car</button>
      </form>
    </ModalPanel>
  );
}

export function DebugVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const action = updateVehicleDebugAction.bind(null, vehicle.id);
  return (
    <ModalPanel trigger="Debug" title="Debug car">
      <form action={action} className="delete-confirm">
        <p className="muted">Debug easter egg controls for this car.</p>
        <label>
          <input type="checkbox" name="debugDestroyed" defaultChecked={Boolean(vehicle.debugDestroyed)} />
          Car has been destroyed
        </label>
        <button className="secondary-button" type="submit">Save debug flag</button>
      </form>
    </ModalPanel>
  );
}

export function EditMaintenanceForm({ record, categories }: { record: MaintenanceRecord; categories: MaintenanceCategory[] }) {
  const updateAction = updateMaintenanceAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMaintenanceAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit maintenance">
      <form action={updateAction} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.date} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions-edit" defaultValue={record.category} autoComplete="off" required />
          <datalist id="category-suggestions-edit">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Description"><input name="description" defaultValue={record.description} required /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={record.notes ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditRepairForm({ record, workshops }: { record: RepairRecord; workshops: Workshop[] }) {
  const updateAction = updateRepairAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteRepairAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit repair">
      <form action={updateAction} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.date} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Fault or repair"><input name="fault" defaultValue={record.fault} required /></Field>
        <Field label="Garage/workshop">
          <input name="garage" list="workshop-suggestions" defaultValue={record.garage ?? ""} autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={record.notes ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditMotForm({ record }: { record: MotRecord }) {
  const updateAction = updateMotAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMotAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit MOT">
      <form action={updateAction} className="record-form">
        <Field label="Test date"><input name="testDate" type="date" defaultValue={record.testDate} required /></Field>
        <Field label="Expiry date"><input name="expiryDate" type="date" defaultValue={record.expiryDate} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Result"><select name="result" defaultValue={record.result} required>
            <option value="pass">Pass</option>
            <option value="advisory">Pass with advisories</option>
            <option value="fail">Fail</option>
          </select></Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Certificate/reference"><input name="certificateRef" defaultValue={record.certificateRef ?? ""} /></Field>
        <Field label="Advisories"><textarea name="advisories" defaultValue={record.advisories ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditReminderForm({ record }: { record: Reminder }) {
  const updateAction = updateReminderAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteReminderAction.bind(null, record.vehicleId, record.id);
  const isMotReminder = record.title.toLowerCase() === "mot due";
  return (
    <EditPanel deleteAction={deleteAction} title="Edit reminder">
      <form action={updateAction} className="record-form">
        <Field label="Title"><input name="title" defaultValue={record.title} required /></Field>
        <Field label="Due date"><input name="dueDate" type="date" defaultValue={record.dueDate ?? ""} /></Field>
        {!isMotReminder ? (
          <Field label="Due mileage"><input name="dueOdometer" type="number" min="0" defaultValue={record.dueOdometer ?? ""} /></Field>
        ) : null}
        <Field label="Recurrence"><select name="recurrence" defaultValue={record.recurrence ?? ""}>
            <option value="">No recurrence</option>
            <option value="12 months">Every 12 months</option>
            <option value="6 months">Every 6 months</option>
            {!isMotReminder ? <option value="10000 miles">Every 10,000 miles</option> : null}
            {!isMotReminder ? <option value="5000 miles">Every 5,000 miles</option> : null}
          </select></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </form>
    </EditPanel>
  );
}

export function EditPlannedPurchaseForm({ record }: { record: PlannedPurchase }) {
  const updateAction = updatePlannedPurchaseAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deletePlannedPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit to-buy item">
      <form action={updateAction} className="record-form">
        <PlannedPurchaseFields record={record} disabled={Boolean(record.purchasedDate)} />
        <button className="primary-button" type="submit" disabled={Boolean(record.purchasedDate)}>Save changes</button>
      </form>
    </EditPanel>
  );
}

export function MaintenanceForm({ vehicleId, categories }: { vehicleId: number; categories: MaintenanceCategory[] }) {
  const action = createMaintenanceAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><Wrench size={17} /> Add maintenance</>} title="Add maintenance">
      <form action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions" autoComplete="off" required />
          <datalist id="category-suggestions">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
        <Field label="Description"><input name="description" required /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Save maintenance</button>
      </form>
    </ModalPanel>
  );
}

export function RepairForm({ vehicleId, workshops }: { vehicleId: number; workshops: Workshop[] }) {
  const action = createRepairAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><Hammer size={17} /> Add repair</>} title="Add repair">
      <form action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Fault or repair"><input name="fault" required /></Field>
        <Field label="Garage/workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Save repair</button>
      </form>
    </ModalPanel>
  );
}

export function MotForm({ vehicleId }: { vehicleId: number }) {
  const action = createMotAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><ShieldCheck size={17} /> Add MOT</>} title="Add MOT">
      <form action={action} className="record-form">
        <Field label="Test date"><input name="testDate" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Expiry date"><input name="expiryDate" type="date" required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Result"><select name="result" defaultValue="pass" required>
            <option value="pass">Pass</option>
            <option value="advisory">Pass with advisories</option>
            <option value="fail">Fail</option>
          </select></Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
        <Field label="Certificate/reference"><input name="certificateRef" /></Field>
        <Field label="Advisories"><textarea name="advisories" /></Field>
        <button className="primary-button" type="submit">Save MOT</button>
      </form>
    </ModalPanel>
  );
}

export function ReminderForm({ vehicleId }: { vehicleId: number }) {
  const action = createReminderAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><CalendarDays size={17} /> Add reminder</>} title="Add reminder">
      <form action={action} className="record-form">
        <Field label="Title"><input name="title" required /></Field>
        <Field label="Due date"><input name="dueDate" type="date" /></Field>
        <Field label="Due mileage"><input name="dueOdometer" type="number" min="0" /></Field>
        <Field label="Recurrence"><select name="recurrence" defaultValue="">
            <option value="">No recurrence</option>
            <option value="12 months">Every 12 months</option>
            <option value="6 months">Every 6 months</option>
            <option value="10000 miles">Every 10,000 miles</option>
            <option value="5000 miles">Every 5,000 miles</option>
          </select></Field>
        <button className="primary-button" type="submit">Save reminder</button>
      </form>
    </ModalPanel>
  );
}

export function PlannedPurchaseForm({ vehicleId }: { vehicleId: number }) {
  const action = createPlannedPurchaseAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><PackagePlus size={17} /> Add item</>} title="Add to-buy item">
      <form action={action} className="record-form">
        <PlannedPurchaseFields />
        <button className="primary-button" type="submit">Save item</button>
      </form>
    </ModalPanel>
  );
}

export function MarkPlannedPurchaseBoughtForm({ record }: { record: PlannedPurchase }) {
  const action = markPlannedPurchaseBoughtAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><ShoppingCart size={17} /> Bought</>} title="Mark item bought">
      <form action={action} className="record-form">
        <Field label="Purchase date"><input name="purchasedDate" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Actual cost"><input name="actualCost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <button className="primary-button" type="submit">Mark bought</button>
      </form>
    </ModalPanel>
  );
}

export function CreateMaintenanceFromPurchaseForm({ record, categories }: { record: PlannedPurchase; categories: MaintenanceCategory[] }) {
  const action = createMaintenanceFromPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><Wrench size={17} /> Add to maintenance</>} title="Add purchase to maintenance">
      <form action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.purchasedDate ?? todayIso()} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions" autoComplete="off" required />
          <datalist id="category-suggestions">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <Field label="Description"><input name="description" defaultValue={record.itemName} required /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={purchaseRecordNotes(record)} /></Field>
        <button className="primary-button" type="submit">Save maintenance</button>
      </form>
    </ModalPanel>
  );
}

export function CreateRepairFromPurchaseForm({ record, workshops }: { record: PlannedPurchase; workshops: Workshop[] }) {
  const action = createRepairFromPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><Hammer size={17} /> Add to repairs</>} title="Add purchase to repairs">
      <form action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.purchasedDate ?? todayIso()} required /></Field>
        <Field label="Mileage"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Fault or repair"><input name="fault" defaultValue={record.itemName} required /></Field>
        <Field label="Garage/workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={purchaseRecordNotes(record)} /></Field>
        <button className="primary-button" type="submit">Save repair</button>
      </form>
    </ModalPanel>
  );
}

function purchaseRecordNotes(record: PlannedPurchase) {
  return [
    record.notes,
    `Purchased item: ${record.itemName}`,
    `Quantity: ${record.quantity}`,
    record.supplier ? `Supplier: ${record.supplier}` : null,
    record.url ? `URL: ${record.url}` : null
  ].filter(Boolean).join("\n");
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PlannedPurchaseFields({ record, disabled = false }: { record?: PlannedPurchase; disabled?: boolean }) {
  return (
    <>
      <Field label="Item"><input name="itemName" defaultValue={record?.itemName ?? ""} required disabled={disabled} /></Field>
      <Field label="Quantity"><input name="quantity" type="number" min="1" defaultValue={record?.quantity ?? 1} disabled={disabled} /></Field>
      <Field label="Estimated cost"><input name="estimatedCost" type="number" min="0" step="0.01" defaultValue={record?.estimatedCost ?? ""} disabled={disabled} /></Field>
      <Field label="Supplier"><input name="supplier" defaultValue={record?.supplier ?? ""} disabled={disabled} /></Field>
      <Field label="Link"><input name="url" type="url" defaultValue={record?.url ?? ""} disabled={disabled} /></Field>
      <Field label="Notes"><textarea name="notes" defaultValue={record?.notes ?? ""} disabled={disabled} /></Field>
    </>
  );
}
