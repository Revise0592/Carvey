"use client";

import { CalendarDays, Check, Trash2 } from "lucide-react";
import { completeReminderAction, createReminderAction, deleteReminderAction, updateReminderAction } from "@/app/actions";
import type { Reminder } from "@/lib/db/types";
import { renewalTypeLabels } from "@/lib/renewals";
import { ActionForm } from "../ActionForm";
import { ConfirmDelete } from "../ConfirmDelete";
import { EditPanel } from "../EditPanel";
import { ModalPanel } from "../ModalPanel";
import { Field } from "./fields";

export function EditReminderForm({ record, isLinked = false, motLabel = "MOT" }: { record: Reminder; isLinked?: boolean; motLabel?: string }) {
  const updateAction = updateReminderAction.bind(null, record.vehicleId, record.id);
  const deleteAction = deleteReminderAction.bind(null, record.vehicleId, record.id);
  const isMotReminder = record.title.toLowerCase() === `${motLabel} due`.toLowerCase();
  const editForm = (
    <ActionForm action={updateAction} className="record-form">
      <Field label="Title"><input name="title" defaultValue={record.title} required /></Field>
      <Field label="Due date"><input name="dueDate" type="date" defaultValue={record.dueDate ?? ""} /></Field>
      {!isMotReminder ? (
        <Field label="Due odometer"><input name="dueOdometer" type="number" min="0" defaultValue={record.dueOdometer ?? ""} /></Field>
      ) : null}
      <Field label="Recurrence"><select name="recurrence" defaultValue={record.recurrence ?? ""}>
          <option value="">No recurrence</option>
          <option value="12 months">Every 12 months</option>
          <option value="6 months">Every 6 months</option>
          {!isMotReminder ? <option value="10000 miles">Every 10,000 miles</option> : null}
          {!isMotReminder ? <option value="5000 miles">Every 5,000 miles</option> : null}
        </select></Field>
      <button className="primary-button" type="submit">Save changes</button>
    </ActionForm>
  );
  if (record.renewalType) {
    return (
      <ModalPanel trigger="Edit" title="Edit reminder">
        <div className="edit-menu">
          <p className="muted">This reminder follows the latest {renewalTypeLabels[record.renewalType].toLowerCase()} record. Change the dates on the Renewals tab instead.</p>
        </div>
      </ModalPanel>
    );
  }
  if (isLinked) {
    return (
      <ModalPanel trigger="Edit" title="Edit reminder">
        <div className="edit-menu">
          {editForm}
          <p className="muted">This reminder is managed by the Service Plan — remove the service interval assignment to delete it.</p>
        </div>
      </ModalPanel>
    );
  }
  return (
    <EditPanel deleteAction={deleteAction} title="Edit reminder">
      {editForm}
    </EditPanel>
  );
}

export function ReminderForm({ vehicleId, autoOpenKey }: { vehicleId: number; autoOpenKey?: string }) {
  const action = createReminderAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><CalendarDays size={17} /> Add reminder</>} title="Add reminder" autoOpenKey={autoOpenKey}>
      <ActionForm action={action} className="record-form">
        <Field label="Title"><input name="title" required /></Field>
        <Field label="Due date"><input name="dueDate" type="date" /></Field>
        <Field label="Due odometer"><input name="dueOdometer" type="number" min="0" /></Field>
        <Field label="Recurrence"><select name="recurrence" defaultValue="">
            <option value="">No recurrence</option>
            <option value="12 months">Every 12 months</option>
            <option value="6 months">Every 6 months</option>
            <option value="10000 miles">Every 10,000 miles</option>
            <option value="5000 miles">Every 5,000 miles</option>
          </select></Field>
        <button className="primary-button" type="submit">Save reminder</button>
      </ActionForm>
    </ModalPanel>
  );
}

export function CompleteReminderButton({ vehicleId, id }: { vehicleId: number; id: number }) {
  const action = completeReminderAction.bind(null, vehicleId);
  return (
    <ActionForm action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="icon-button" type="submit" title="Mark complete" aria-label="Mark complete">
        <Check size={17} />
      </button>
    </ActionForm>
  );
}

export function ClearReminderButton({ record }: { record: Reminder }) {
  const deleteAction = deleteReminderAction.bind(null, record.vehicleId, record.id);
  return (
    <ModalPanel trigger={<Trash2 size={17} />} triggerClassName="icon-button" triggerLabel="Remove reminder" title="Remove completed reminder">
      <div className="edit-menu">
        <p className="muted">Remove &ldquo;{record.title}&rdquo; from the reminders list.</p>
        <ConfirmDelete action={deleteAction} label="Remove" />
      </div>
    </ModalPanel>
  );
}
