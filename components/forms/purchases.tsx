"use client";

import { CalendarDays, Hammer, PackagePlus, ShoppingCart, Wrench } from "lucide-react";
import {
  createMaintenanceFromPurchaseAction,
  createPlannedPurchaseAction,
  createRepairFromPurchaseAction,
  deletePlannedPurchaseAction,
  markPlannedPurchaseBoughtAction,
  updatePlannedPurchaseAction,
  updatePlannedPurchasePurchasedDateAction
} from "@/app/actions";
import type { MaintenanceCategory, PlannedPurchase, Workshop } from "@/lib/db/types";
import { todayIso } from "@/lib/dates";
import { ActionForm } from "../ActionForm";
import { EditPanel } from "../EditPanel";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

export function EditPlannedPurchaseForm({ record }: { record: PlannedPurchase }) {
  const updateAction = updatePlannedPurchaseAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deletePlannedPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title="Edit To Buy Item">
      <ActionForm action={updateAction} className="record-form">
        <PlannedPurchaseFields record={record} disabled={Boolean(record.purchasedDate)} />
        <button className="primary-button" type="submit" disabled={Boolean(record.purchasedDate)}>Save changes</button>
      </ActionForm>
    </EditPanel>
  );
}

export function PlannedPurchaseForm({ vehicleId, autoOpenKey }: { vehicleId: number; autoOpenKey?: string }) {
  const action = createPlannedPurchaseAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><PackagePlus size={17} /> Add item</>} title="Add To Buy Item" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <PlannedPurchaseFields />
        <button className="primary-button" type="submit">Save item</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function MarkPlannedPurchaseBoughtForm({ record }: { record: PlannedPurchase }) {
  const action = markPlannedPurchaseBoughtAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><ShoppingCart size={17} /> Bought</>} title="Mark item bought">
      <ActionForm action={action} className="record-form">
        <Field label="Purchase date"><input name="purchasedDate" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Actual cost"><input name="actualCost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <button className="primary-button" type="submit">Mark bought</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function EditPlannedPurchaseBoughtDateForm({ record }: { record: PlannedPurchase }) {
  const action = updatePlannedPurchasePurchasedDateAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><CalendarDays size={17} /> Edit bought date</>} title="Edit bought date">
      <ActionForm action={action} className="record-form">
        <Field label="Bought date"><input name="purchasedDate" type="date" defaultValue={record.purchasedDate ?? todayIso()} required /></Field>
        <button className="primary-button" type="submit">Save bought date</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function CreateMaintenanceFromPurchaseForm({ record, categories, workshops }: { record: PlannedPurchase; categories: MaintenanceCategory[]; workshops: Workshop[] }) {
  const action = createMaintenanceFromPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><Wrench size={17} /> Add to maintenance</>} title="Add purchase to maintenance">
      <ActionForm action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Category">
          <input name="category" list="category-suggestions" autoComplete="off" required />
          <datalist id="category-suggestions">
            {categories.map((c) => <option value={c.name} key={c.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <Field label="Description"><input name="description" defaultValue={record.itemName} required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Notes"><textarea name="notes" defaultValue={purchaseRecordNotes(record)} /></Field>
        <button className="primary-button" type="submit">Save maintenance</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function CreateRepairFromPurchaseForm({ record, workshops }: { record: PlannedPurchase; workshops: Workshop[] }) {
  const action = createRepairFromPurchaseAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<><Hammer size={17} /> Add to repairs</>} title="Add purchase to repairs">
      <ActionForm action={action} className="record-form">
        <Field label="Date"><input name="date" type="date" defaultValue={todayIso()} required /></Field>
        <Field label="Odometer"><input name="odometer" type="number" min="0" /></Field>
        <Field label="Fault or repair"><input name="fault" defaultValue={record.itemName} required /></Field>
        <Field label="Garage/Workshop">
          <input name="garage" list="workshop-suggestions" autoComplete="off" />
          <datalist id="workshop-suggestions">
            {workshops.map((w) => <option value={w.name} key={w.id} />)}
          </datalist>
        </Field>
        <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record.actualCost ?? record.estimatedCost} /></Field>
        <Field label="Notes"><textarea name="notes" defaultValue={purchaseRecordNotes(record)} /></Field>
        <button className="primary-button" type="submit">Save repair</button>
      </ActionForm>
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

// ─── Renewals ───────────────────────────────────────────────────────────────
