"use client";

import { Pencil, Plus } from "lucide-react";
import { createVehicleAction, deleteVehicleAction, updateVehicleDebugAction, updateVehicleAction } from "@/app/actions";
import type { Vehicle } from "@/lib/db/types";
import { ActionForm } from "../ActionForm";
import { ConfirmDelete } from "../ConfirmDelete";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

export function CreateVehicleForm({ registrationLabel = "Registration", autoOpenKey }: { registrationLabel?: string; autoOpenKey?: string }) {
  return (
    <ModalPanel trigger={<><Plus size={17} /> Add vehicle</>} title="Add vehicle" autoOpenKey={autoOpenKey}>
      <ActionForm action={createVehicleAction} className="record-form">
        <Field label="Make"><input name="make" required /></Field>
        <Field label="Model"><input name="model" required /></Field>
        <Field label="Year"><input name="year" type="number" min="1886" max="2100" /></Field>
        <Field label={registrationLabel}><input name="registration" required /></Field>
        <Field label="VIN"><input name="vin" /></Field>
        <Field label="Odometer"><input name="currentOdometer" type="number" min="0" /></Field>
        <Field label="Purchase price"><input name="purchasePrice" type="number" min="0" step="0.01" /></Field>
        <Field label="Purchase date"><input name="purchaseDate" type="date" /></Field>
        <Field label="Notes"><textarea name="notes" /></Field>
        <button className="primary-button" type="submit">Create vehicle</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function EditVehicleForm({ vehicle, registrationLabel = "Registration" }: { vehicle: Vehicle; registrationLabel?: string }) {
  const updateAction = updateVehicleAction.bind(null, vehicle.id);
  const deleteAction = deleteVehicleAction.bind(null, vehicle.id);
  return (
    <ModalPanel trigger={<><Pencil size={17} /> Edit</>} title="Edit car">
      <ActionForm action={updateAction} className="record-form">
        <Field label="Make"><input name="make" defaultValue={vehicle.make} required /></Field>
        <Field label="Model"><input name="model" defaultValue={vehicle.model} required /></Field>
        <Field label="Year"><input name="year" type="number" min="1886" max="2100" defaultValue={vehicle.year ?? ""} /></Field>
        <Field label={registrationLabel}><input name="registration" defaultValue={vehicle.registration} required /></Field>
        <Field label="VIN"><input name="vin" defaultValue={vehicle.vin ?? ""} /></Field>
        <Field label="Odometer"><input name="currentOdometer" type="number" min="0" defaultValue={vehicle.currentOdometer ?? ""} /></Field>
        <Field label="Purchase price"><input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={vehicle.purchasePrice ?? ""} /></Field>
        <Field label="Purchase date"><input name="purchaseDate" type="date" defaultValue={vehicle.purchaseDate ?? ""} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={vehicle.notes ?? ""} /></Field>
        <label className="checkbox-field">
          <input name="sold" type="checkbox" defaultChecked={Boolean(vehicle.sold)} />
          Mark as sold
        </label>
        <button className="primary-button" type="submit">Save car</button>
      </ActionForm>
      <hr className="modal-divider" />
      <p className="muted">This removes {vehicle.make} {vehicle.model} and all of its logs.</p>
      <ConfirmDelete action={deleteAction} label="Delete car" />
    </ModalPanel>
  );
}

export function DebugVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const action = updateVehicleDebugAction.bind(null, vehicle.id);
  return (
    <ModalPanel trigger="Debug" title="Debug car">
      <ActionForm action={action} className="delete-confirm">
        <p className="muted">Debug easter egg controls for this car.</p>
        <label>
          <input type="checkbox" name="debugDestroyed" defaultChecked={Boolean(vehicle.debugDestroyed)} />
          Car has been destroyed
        </label>
        <button className="secondary-button" type="submit">Save debug flag</button>
      </ActionForm>
    </ModalPanel>
  );
}
