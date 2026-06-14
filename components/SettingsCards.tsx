"use client";

import { Trash2 } from "lucide-react";
import {
  deleteMaintenanceCategoryAction,
  deleteServiceIntervalAction,
  deleteWorkshopAction,
  updateMaintenanceCategoryAction,
  updateServiceIntervalAction,
  updateWorkshopAction
} from "@/app/actions";
import type { MaintenanceCategory, ServiceInterval, Workshop } from "@/lib/db";
import { ConfirmDelete } from "./ConfirmDelete";

export function WorkshopCard({ workshop }: { workshop: Workshop }) {
  const updateAction = updateWorkshopAction.bind(null, workshop.id);
  const deleteAction = deleteWorkshopAction.bind(null, workshop.id);
  return (
    <article className="workshop-card">
      <div>
        <h3>{workshop.name}</h3>
        {workshop.preferred ? <span className="tag tag-success">Preferred</span> : null}
      </div>
      {workshop.address ? <p>{workshop.address}</p> : null}
      {[workshop.phone, workshop.email, workshop.website].filter(Boolean).length ? (
        <p className="muted">{[workshop.phone, workshop.email, workshop.website].filter(Boolean).join(" · ")}</p>
      ) : null}
      {workshop.notes ? <p>{workshop.notes}</p> : null}
      <details>
        <summary className="secondary-button">Edit</summary>
        <form action={updateAction} className="record-form">
          <label>Name<input name="name" defaultValue={workshop.name} required maxLength={100} /></label>
          <label>Address<textarea name="address" defaultValue={workshop.address ?? ""} /></label>
          <label>Phone<input name="phone" defaultValue={workshop.phone ?? ""} /></label>
          <label>Email<input name="email" type="email" defaultValue={workshop.email ?? ""} /></label>
          <label>Website<input name="website" type="url" defaultValue={workshop.website ?? ""} /></label>
          <label>Notes<textarea name="notes" defaultValue={workshop.notes ?? ""} /></label>
          <label className="checkbox-field">
            <input name="preferred" type="checkbox" defaultChecked={Boolean(workshop.preferred)} />
            Preferred Garage/Workshop
          </label>
          <button className="primary-button" type="submit">Save changes</button>
        </form>
      </details>
      <ConfirmDelete action={deleteAction} />
    </article>
  );
}

export function ServiceIntervalCard({ interval, distanceUnit }: { interval: ServiceInterval; distanceUnit: string }) {
  const updateAction = updateServiceIntervalAction.bind(null, interval.id);
  const deleteAction = deleteServiceIntervalAction.bind(null, interval.id);
  const desc = formatIntervalDescription(interval, distanceUnit);
  return (
    <article className="workshop-card">
      <h3>{interval.name}</h3>
      {desc ? <p className="muted">{desc}</p> : null}
      <details>
        <summary className="secondary-button">Edit</summary>
        <form action={updateAction} className="record-form">
          <label>Name<input name="name" defaultValue={interval.name} required maxLength={100} /></label>
          <label>Every (months)<input name="intervalMonths" type="number" min="1" max="120" defaultValue={interval.intervalMonths ?? ""} placeholder="12" /></label>
          <label>Every ({distanceUnit})<input name="intervalMileage" type="number" min="1" defaultValue={interval.intervalMileage ?? ""} placeholder="10000" /></label>
          <button className="primary-button" type="submit">Save changes</button>
        </form>
      </details>
      <ConfirmDelete action={deleteAction} />
    </article>
  );
}

export function CategoryCard({ category }: { category: MaintenanceCategory }) {
  const updateAction = updateMaintenanceCategoryAction.bind(null, category.id);
  const deleteAction = deleteMaintenanceCategoryAction.bind(null, category.id);
  return (
    <article className="workshop-card">
      <h3>{category.name}</h3>
      <details>
        <summary className="secondary-button">Edit</summary>
        <form action={updateAction} className="record-form">
          <label>Name<input name="name" defaultValue={category.name} required maxLength={100} /></label>
          <button className="primary-button" type="submit">Save changes</button>
        </form>
      </details>
      <ConfirmDelete action={deleteAction} />
    </article>
  );
}

function formatIntervalDescription(interval: ServiceInterval, distanceUnit: string): string {
  const parts: string[] = [];
  if (interval.intervalMonths) parts.push(`Every ${interval.intervalMonths} months`);
  if (interval.intervalMileage) parts.push(`every ${interval.intervalMileage.toLocaleString()} ${distanceUnit}`);
  return parts.join(" · ");
}
