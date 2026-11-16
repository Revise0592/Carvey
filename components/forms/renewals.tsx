"use client";

import { Check, FileBadge } from "lucide-react";
import { createRenewalAction, deleteRenewalAction, dismissReminderAction, updateRenewalAction } from "@/app/actions";
import type { Reminder, Renewal, RenewalType } from "@/lib/db/types";
import { addMonths } from "@/lib/dates";
import { renewalTypeLabels, renewalTypeOptions } from "@/lib/renewals";
import { todayIso } from "@/lib/dates";
import { ActionForm } from "../ActionForm";
import { EditPanel } from "../EditPanel";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

function RenewalFields({ record, defaults }: { record?: Renewal; defaults?: { type?: RenewalType; startDate?: string; endDate?: string; provider?: string | null } }) {
  const startDate = record?.startDate ?? defaults?.startDate ?? todayIso();
  return (
    <>
      <Field label="Type">
        <select name="type" defaultValue={record?.type ?? defaults?.type ?? "insurance"} required>
          {renewalTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <Field label="Provider"><input name="provider" defaultValue={record?.provider ?? defaults?.provider ?? ""} placeholder="Insurer, DVLA, warranty company..." /></Field>
      <Field label="Policy or reference number"><input name="reference" defaultValue={record?.reference ?? ""} /></Field>
      <Field label="Start date"><input name="startDate" type="date" defaultValue={startDate} /></Field>
      <Field label="End / renewal date"><input name="endDate" type="date" defaultValue={record?.endDate ?? defaults?.endDate ?? addMonths(startDate, 12)} required /></Field>
      <Field label="Cost"><input name="cost" type="number" min="0" step="0.01" defaultValue={record?.cost ?? ""} /></Field>
      <Field label="Notes"><textarea name="notes" defaultValue={record?.notes ?? ""} /></Field>
    </>
  );
}

export function RenewalForm({ vehicleId, autoOpenKey }: { vehicleId: number; autoOpenKey?: string }) {
  const action = createRenewalAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><FileBadge size={17} /> Add renewal</>} title="Add renewal" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <RenewalFields />
        <button className="primary-button" type="submit">Save renewal</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function EditRenewalForm({ record }: { record: Renewal }) {
  const updateAction = updateRenewalAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteRenewalAction.bind(null, record.vehicleId, record.id);
  return (
    <EditPanel deleteAction={deleteAction} title={`Edit ${renewalTypeLabels[record.type].toLowerCase()}`}>
      <ActionForm action={updateAction} className="record-form">
        <RenewalFields record={record} />
        <button className="primary-button" type="submit">Save changes</button>
      </ActionForm>
    </EditPanel>
  );
}

/** Ticking a renewal reminder logs the renewed policy, which moves the reminder to the new end date. */
export function CompleteRenewalReminderButton({ reminder, previous }: { reminder: Reminder; previous: Pick<Renewal, "endDate" | "provider"> | null }) {
  const type = reminder.renewalType ?? "other";
  const action = createRenewalAction.bind(null, reminder.vehicleId);
  const dismissAction = dismissReminderAction.bind(null, reminder.vehicleId, reminder.id);
  const startDate = previous?.endDate ?? reminder.dueDate ?? todayIso();
  return (
    <ModalPanel trigger={<Check size={17} />} triggerClassName="icon-button" triggerLabel={`Renew ${renewalTypeLabels[type].toLowerCase()}`} title={`Renew ${renewalTypeLabels[type].toLowerCase()}`}>
      <p className="muted sheet-intro">Log the renewed cover and the reminder moves to its new end date.</p>
      <ActionForm action={action} className="record-form">
        <RenewalFields defaults={{ type, startDate, endDate: addMonths(startDate, 12), provider: previous?.provider }} />
        <button className="primary-button" type="submit">Save renewal</button>
      </ActionForm>
      <hr className="modal-divider" />
      <ActionForm action={dismissAction} className="record-form">
        <p className="muted">Not renewing? Mark the reminder done instead.</p>
        <button className="secondary-button" type="submit">Not renewing</button>
      </ActionForm>
    </ModalPanel>
  );
}
