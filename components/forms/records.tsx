"use client";

import { Check, Fuel, Hammer, ShieldCheck, Wrench } from "lucide-react";
import {
  createFuelRecordAction,
  createMaintenanceAction,
  createMotAction,
  createRepairAction,
  deleteFuelRecordAction,
  deleteMaintenanceAction,
  deleteMotAction,
  deleteRepairAction,
  updateFuelRecordAction,
  updateMaintenanceAction,
  updateMotAction,
  updateRepairAction
} from "@/app/actions";
import type { FuelRecord, MaintenanceCategory, MaintenanceRecord, MotRecord, RepairRecord, Workshop } from "@/lib/db/types";
import { todayIso } from "@/lib/dates";
import type { RegionalSettings } from "@/lib/regional-settings";
import { ActionForm } from "../ActionForm";
import { EditPanel } from "../EditPanel";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

export function EditMaintenanceForm({ record, categories, workshops }: { record: MaintenanceRecord; categories: MaintenanceCategory[]; workshops: Workshop[] }) {
  const updateAction = updateMaintenanceAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMaintenanceAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit maintenance">
      <ActionForm action={updateAction} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.date} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions-edit" defaultValue={record.category} autoComplete="off" required />
          <datalist id="category-suggestions-edit">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Description"><input name="description" defaultValue={record.description} required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" defaultValue={record.garage ?? ""} autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Notes"><textarea name="notes" defaultValue={record.notes ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </ActionForm>
    </EditPanel>
  );
}

export function EditRepairForm({ record, workshops }: { record: RepairRecord; workshops: Workshop[] }) {
  const updateAction = updateRepairAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteRepairAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit repair">
      <ActionForm action={updateAction} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.date} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Fault or repair"><input name="fault" defaultValue={record.fault} required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" defaultValue={record.garage ?? ""} autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={record.notes ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </ActionForm>
    </EditPanel>
  );
}

export function EditMotForm({ record, motLabel = "MOT" }: { record: MotRecord; motLabel?: string }) {
  const updateAction = updateMotAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteMotAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title={`Edit ${motLabel}`}>
      <ActionForm action={updateAction} className="record-form">
        <Field label="Test date"><input name="testDate" type="date" defaultValue={record.testDate} required /></Field>
        <Field label="Expiry date"><input name="expiryDate" type="date" defaultValue={record.expiryDate} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" defaultValue={record.odometer ?? ""} /></Field>
        <Field label="Result"><select name="result" defaultValue={record.result} required>
            <option value="pass">Pass</option>
            <option value="advisory">Pass with advisories</option>
            <option value="fail">Fail</option>
          </select></Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.cost} /></Field>
        <Field label="Certificate/reference"><input name="certificateRef" defaultValue={record.certificateRef ?? ""} /></Field>
        <Field label="Advisories"><textarea name="advisories" defaultValue={record.advisories ?? ""} /></Field>
        <button className="primary-button" type="submit">Save changes</button>
      </ActionForm>
    </EditPanel>
  );
}

export function MaintenanceForm({ vehicleId, categories, workshops, autoOpenKey }: { vehicleId: number; categories: MaintenanceCategory[]; workshops: Workshop[]; autoOpenKey?: string }) {
  const action = createMaintenanceAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><Wrench size={17} /> Add maintenance</>} title="Add maintenance" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions" autoComplete="off" required />
          <datalist id="category-suggestions">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
        <Field label="Description"><input name="description" required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Save maintenance</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function RepairForm({ vehicleId, workshops, autoOpenKey }: { vehicleId: number; workshops: Workshop[]; autoOpenKey?: string }) {
  const action = createRepairAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><Hammer size={17} /> Add repair</>} title="Add repair" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Fault or repair"><input name="fault" required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Save repair</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function MotForm({ vehicleId, motLabel = "MOT", autoOpenKey }: { vehicleId: number; motLabel?: string; autoOpenKey?: string }) {
  return (
    <ModalPanel trigger={<><ShieldCheck size={17} /> Add {motLabel}</>} title={`Add ${motLabel}`} autoOpenKey={autoOpenKey}>
      <MotFields vehicleId={vehicleId} motLabel={motLabel} />
    </ModalPanel>
  );
}

// Shown in place of the plain "Mark complete" tick on the MOT reminder: completing it means
// logging the test, which then resets the reminder to the new expiry date.
export function CompleteMotReminderButton({ vehicleId, motLabel = "MOT", defaultExpiryDate }: { vehicleId: number; motLabel?: string; defaultExpiryDate?: string }) {
  return (
    <ModalPanel trigger={<Check size={17} />} triggerClassName="icon-button" triggerLabel={`Log ${motLabel}`} title={`Log ${motLabel}`}>
      <p className="muted sheet-intro">Record the test result and the reminder will reset to the new expiry date.</p>
      <MotFields vehicleId={vehicleId} motLabel={motLabel} defaultExpiryDate={defaultExpiryDate} />
    </ModalPanel>
  );
}

function MotFields({ vehicleId, motLabel, defaultExpiryDate }: { vehicleId: number; motLabel: string; defaultExpiryDate?: string }) {
  const action = createMotAction.bind(null, vehicleId);
  return (
    <ActionForm action={action} className="record-form">
      <Field label="Test date"><input name="testDate" type="date" defaultValue={todayIso()} required /></Field>
      <Field label="Expiry date"><input name="expiryDate" type="date" defaultValue={defaultExpiryDate} required /></Field>
      <Field label="Odometer"><input name="odometer" type="number" min="0" /></Field>
      <Field label="Result"><select name="result" defaultValue="pass" required>
          <option value="pass">Pass</option>
          <option value="advisory">Pass with advisories</option>
          <option value="fail">Fail</option>
        </select></Field>
      <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" /></Field>
      <Field label="Certificate/reference"><input name="certificateRef" /></Field>
      <Field label="Advisories"><textarea name="advisories" /></Field>
      <button className="primary-button" type="submit">Save {motLabel}</button>
    </ActionForm>
  );
}

export function FuelRecordForm({ vehicleId, settings, autoOpenKey }: { vehicleId: number; settings: RegionalSettings; autoOpenKey?: string }) {
  const action = createFuelRecordAction.bind(null, vehicleId);
  const isKm = settings.distanceUnit === "km";
  const isGallons = settings.fuelVolumeUnit === "gallons";
  const petrolLabel = isGallons ? "Gasoline" : "Petrol";
  const volumeLabel = isGallons ? "Gallons" : "Litres";
  return (
    <ModalPanel trigger={<><Fuel size={17} /> Add fill-up</>} title="Log fuel" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label={isKm ? "Odometer (km)" : "Mileage"}><input name="odometer" type="number" min="0" required /></Field>
        <Field label="Fuel type">
          <select name="fuelType" defaultValue="petrol">
            <option value="petrol">{petrolLabel}</option>
            <option value="diesel">Diesel</option>
            <option value="lpg">LPG</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label={volumeLabel}><input name="volume" type="number" min="0" step="0.01" required /></Field>
        <label className="checkbox-field">
          <input name="fullTank" type="checkbox" defaultChecked />
          Full tank
        </label>
        <Field label="Total cost"><input name="totalCost" type="number" min="0" step="0.01" /></Field>
        <Field label="Station"><input name="station" /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Save fill-up</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function EditFuelRecordForm({ record, settings }: { record: FuelRecord; settings: RegionalSettings }) {
  const updateAction = updateFuelRecordAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteFuelRecordAction.bind(null, record.vehicleId, record.id);
  const isKm = settings.distanceUnit === "km";
  const isGallons = settings.fuelVolumeUnit === "gallons";
  const petrolLabel = isGallons ? "Gasoline" : "Petrol";
  const volumeLabel = isGallons ? "Gallons" : "Litres";
  const displayVolume = isGallons
    ? (record.volumeLitres / 3.78541).toFixed(2)
    : record.volumeLitres.toFixed(2);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit fill-up">
      <ActionForm action={updateAction} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={record.date} required /></Field>
        <Field label={isKm ? "Odometer (km)" : "Mileage"}><input name="odometer" type="number" min="0" defaultValue={record.odometer} required /></Field>
        <Field label="Fuel type">
          <select name="fuelType" defaultValue={record.fuelType}>
            <option value="petrol">{petrolLabel}</option>
            <option value="diesel">Diesel</option>
            <option value="lpg">LPG</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label={volumeLabel}><input name="volume" type="number" min="0" step="0.01" defaultValue={displayVolume} required /></Field>
        <label className="checkbox-field">
          <input name="fullTank" type="checkbox" defaultChecked={Boolean(record.fullTank)} />
          Full tank
        </label>
        <Field label="Total cost"><input name="totalCost" type="number" min="0" step="0.01" defaultValue={record.totalCost ?? ""} /></Field>
        <Field label="Station"><input name="station" defaultValue={record.station ?? ""} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={record.notes ?? ""} /></Field>
        <button className="primary-button" type="submit">Save fill-up</button>
      </ActionForm>
    </EditPanel>
  );
}
