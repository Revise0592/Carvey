import { CalendarDays, Check, ExternalLink, PackagePlus, Plus, RefreshCw } from "lucide-react";
import { assignServiceIntervalAction, recordServiceDoneAction, removeVehicleServiceIntervalAction } from "@/app/actions";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import {
  ClearReminderButton,
  CompleteMotReminderButton,
  CompleteRenewalReminderButton,
  CompleteReminderButton,
  CreateMaintenanceFromPurchaseForm,
  CreateRepairFromPurchaseForm,
  EditPlannedPurchaseBoughtDateForm,
  EditPlannedPurchaseForm,
  EditReminderForm,
  MarkPlannedPurchaseBoughtForm,
  PlannedPurchaseForm,
  ReminderForm
} from "@/components/Forms";
import { ModalPanel } from "@/components/ModalPanel";
import { RecordItem } from "@/components/RecordItem";
import {
  listMaintenanceCategories,
  listOdometerReadings,
  listPlannedPurchases,
  listReminders,
  listRenewals,
  listServiceIntervals,
  listVehicleServiceIntervals,
  listWorkshops,
  type Renewal,
  type ServiceInterval,
  type Vehicle,
  type VehicleServiceInterval
} from "@/lib/db";
import { formatCurrency, formatDate, formatMiles, formatPlannedPurchaseStatus, formatReminderStatus, todayIso } from "@/lib/format";
import { estimateMileageRate, reminderTiming } from "@/lib/mileage";
import type { RegionalSettings } from "@/lib/regional-settings";
import { getReminderStatus } from "@/lib/reminders";
import { addYear, byNumber, byText, EmptyRecords, plannedPurchaseStatus, reminderStatusTone, SortBar, sortBy, sortState, type SectionProps } from "./shared";

export function RemindersSection({ vehicle, settings, motLabel, query }: SectionProps) {
  const reminders = listReminders(vehicle.id);
  const servicePlan = listVehicleServiceIntervals(vehicle.id);
  const servicePlanByReminderId = new Map(servicePlan.filter((v) => v.reminderId !== null).map((v) => [v.reminderId!, v]));
  const latestRenewalByType = new Map<string, Renewal>();
  for (const renewal of listRenewals(vehicle.id)) {
    if (!latestRenewalByType.has(renewal.type)) latestRenewalByType.set(renewal.type, renewal);
  }
  const rate = estimateMileageRate(listOdometerReadings(vehicle.id));
  const isMotReminder = (reminder: { title: string; renewalType?: string | null }) =>
    !reminder.renewalType && reminder.title.toLowerCase() === `${motLabel} due`.toLowerCase();
  // A test taken before expiry keeps the anniversary date; one taken late runs a year from today.
  const nextMotExpiry = (dueDate: string | null) => addYear(dueDate && dueDate >= todayIso() ? dueDate : todayIso());

  const statusOrder: Record<string, number> = { overdue: 0, upcoming: 1, open: 2, done: 3 };
  const rows = reminders.map((record) => ({ record, status: getReminderStatus(record, vehicle), timing: reminderTiming(record, rate) }));
  const { sort, dir } = sortState(query, "status");
  const sorted = sortBy(rows, sort, dir, {
    status: (a, b) => (statusOrder[b.status] ?? 4) - (statusOrder[a.status] ?? 4),
    dueDate: byText((row) => row.timing.effectiveDate)
  });

  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><CalendarDays size={19} /> Reminders</h2>
        <ReminderForm vehicleId={vehicle.id} autoOpenKey={query.new} />
      </div>
      {reminders.length ? (
        <>
          <SortBar vehicleId={vehicle.id} tab="reminders" activeSort={sort} activeDir={dir} options={[
            { key: "status", label: "Status" },
            { key: "dueDate", label: "Due date" }
          ]} />
          <div className="record-list">
            {sorted.map(({ record, status, timing }) => {
              const meta = [
                record.dueDate ? `Due ${formatDate(record.dueDate, settings)}` : "No date set",
                isMotReminder(record) ? null : record.dueOdometer !== null ? formatMiles(record.dueOdometer, settings) : null,
                !record.completedAt && timing.estimatedDate
                  ? timing.probablyReached
                    ? "Probably reached by now — update the mileage"
                    : `≈ ${formatDate(timing.estimatedDate, settings)} at current mileage`
                  : null,
                record.recurrence ? `Repeats ${record.recurrence}` : null
              ].filter(Boolean).join(" · ");
              const linked = servicePlanByReminderId.has(record.id) || Boolean(record.renewalType);
              return (
                <RecordItem
                  key={record.id}
                  tag={<span className={`tag ${reminderStatusTone(status)}`}>{formatReminderStatus(status)}</span>}
                  title={record.title}
                  meta={meta}
                  actions={<>
                    {!record.completedAt ? (
                      servicePlanByReminderId.has(record.id)
                        ? <RecordServiceButton record={servicePlanByReminderId.get(record.id)!} vehicle={vehicle} compact />
                        : record.renewalType
                          ? <CompleteRenewalReminderButton reminder={record} previous={latestRenewalByType.get(record.renewalType) ?? null} />
                          : isMotReminder(record) && settings.motFeature !== "disabled"
                            ? <CompleteMotReminderButton vehicleId={vehicle.id} motLabel={motLabel} defaultExpiryDate={nextMotExpiry(record.dueDate)} />
                            : <CompleteReminderButton vehicleId={vehicle.id} id={record.id} />
                    ) : !linked ? <ClearReminderButton record={record} /> : null}
                    <EditReminderForm record={record} isLinked={servicePlanByReminderId.has(record.id)} motLabel={motLabel} />
                  </>}
                />
              );
            })}
          </div>
        </>
      ) : (
        <EmptyRecords title="No reminders set">Create reminders for upcoming jobs, inspections, or mileage milestones.</EmptyRecords>
      )}
    </section>
  );
}

export function ServicePlanSection({ vehicle, settings }: SectionProps) {
  const assigned = listVehicleServiceIntervals(vehicle.id);
  const all = listServiceIntervals();
  const unassigned = all.filter((si) => !assigned.some((vsi) => vsi.serviceIntervalId === si.id));
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><RefreshCw size={19} />Service Plan</h2>
        {unassigned.length ? <AssignServiceIntervalForm vehicleId={vehicle.id} intervals={unassigned} distanceUnit={settings.distanceUnit} /> : null}
      </div>
      <div className="records-grid">
        {assigned.length ? (
          assigned.map((record) => <ServicePlanCard key={record.id} record={record} vehicle={vehicle} settings={settings} />)
        ) : (
          <EmptyRecords title="No services scheduled">
            {all.length
              ? "Assign a service interval to start tracking this vehicle's service plan."
              : "Define service intervals in Settings first, then assign them here."}
          </EmptyRecords>
        )}
      </div>
    </section>
  );
}

export function ToBuySection({ vehicle, settings, query }: SectionProps) {
  const purchases = listPlannedPurchases(vehicle.id);
  const toBuy = purchases.filter((record) => !record.purchasedDate);
  const purchased = purchases.filter((record) => record.purchasedDate);
  const needsConversionForms = purchased.some((record) => !record.convertedAt);
  const categories = needsConversionForms ? listMaintenanceCategories() : [];
  const workshops = needsConversionForms ? listWorkshops() : [];
  const { sort, dir } = sortState(query, "dueDate");
  const sortedToBuy = sortBy(toBuy, sort, dir, {
    dueDate: byText((r) => r.dueDate),
    cost: byNumber((r) => r.estimatedCost),
    itemName: byText((r) => r.itemName)
  });
  const sortedPurchased = sortBy(purchased, sort, dir, {
    dueDate: byText((r) => r.purchasedDate),
    cost: byNumber((r) => r.actualCost ?? r.estimatedCost),
    itemName: byText((r) => r.itemName)
  });
  const productLink = (url: string | null) => url
    ? <a className="icon-button" href={url} target="_blank" rel="noreferrer" aria-label="Open product link" title="Open product link"><ExternalLink size={16} /></a>
    : null;

  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><PackagePlus size={19} /> To Buy</h2>
        <PlannedPurchaseForm vehicleId={vehicle.id} autoOpenKey={query.new} />
      </div>
      {purchases.length ? (
        <>
          <SortBar vehicleId={vehicle.id} tab="to-buy" activeSort={sort} activeDir={dir} options={[
            { key: "dueDate", label: "Due date" },
            { key: "cost", label: "Cost" },
            { key: "itemName", label: "Name" }
          ]} />
          <div className="record-list">
            <p className="record-list-subheading">To Buy</p>
            {sortedToBuy.length ? sortedToBuy.map((record) => (
              <RecordItem
                key={record.id}
                tag={<span className="tag tag-neutral">{formatPlannedPurchaseStatus("to-buy")}</span>}
                title={record.itemName}
                meta={[
                  `Qty ${record.quantity}`,
                  record.supplier,
                  record.dueDate ? `Due ${formatDate(record.dueDate, settings)}` : null
                ].filter(Boolean).join(" · ")}
                value={formatCurrency(record.estimatedCost, settings)}
                actions={<>
                  {productLink(record.url)}
                  <MarkPlannedPurchaseBoughtForm record={record} />
                  <EditPlannedPurchaseForm record={record} />
                </>}
              />
            )) : <p className="record-list-empty">Nothing left to buy.</p>}

            <p className="record-list-subheading">Purchased</p>
            {sortedPurchased.length ? sortedPurchased.map((record) => (
              <RecordItem
                key={record.id}
                tag={<span className={`tag ${record.convertedAt ? "tag-success" : "tag-neutral"}`}>
                  {formatPlannedPurchaseStatus(plannedPurchaseStatus(record.convertedAt, record.convertedToType))}
                </span>}
                title={record.itemName}
                meta={[
                  `Qty ${record.quantity}`,
                  record.purchasedDate ? `Bought ${formatDate(record.purchasedDate, settings)}` : null,
                  record.supplier
                ].filter(Boolean).join(" · ")}
                value={formatCurrency(record.actualCost ?? record.estimatedCost, settings)}
                actions={<>
                  {productLink(record.url)}
                  {!record.convertedAt ? (
                    <>
                      <CreateMaintenanceFromPurchaseForm record={record} categories={categories} workshops={workshops} />
                      <CreateRepairFromPurchaseForm record={record} workshops={workshops} />
                    </>
                  ) : null}
                  <EditPlannedPurchaseBoughtDateForm record={record} />
                </>}
              />
            )) : <p className="record-list-empty">Purchased items will appear here once bought.</p>}
          </div>
        </>
      ) : (
        <EmptyRecords title="No planned purchases">Add parts or supplies you need to buy before the next job.</EmptyRecords>
      )}
    </section>
  );
}

function AssignServiceIntervalForm({ vehicleId, intervals, distanceUnit }: { vehicleId: number; intervals: ServiceInterval[]; distanceUnit: string }) {
  const action = assignServiceIntervalAction.bind(null, vehicleId);
  return (
    <ModalPanel trigger={<><Plus size={17} /> Assign interval</>} title="Assign service interval">
      <form action={action} className="record-form">
        <label>
          Service interval
          <select name="serviceIntervalId" required>
            <option value="">Select an interval…</option>
            {intervals.map((si) => (
              <option value={si.id} key={si.id}>
                {si.name}
                {si.intervalMonths ? ` — every ${si.intervalMonths} months` : ""}
                {si.intervalMileage ? ` / ${si.intervalMileage.toLocaleString()} ${distanceUnit}` : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="submit">Assign</button>
      </form>
    </ModalPanel>
  );
}

function ServicePlanCard({ record, vehicle, settings }: { record: VehicleServiceInterval; vehicle: Vehicle; settings: RegionalSettings }) {
  const removeAction = removeVehicleServiceIntervalAction.bind(null, vehicle.id, record.id);
  const intervalDesc = [
    record.intervalMonths ? `Every ${record.intervalMonths} months` : null,
    record.intervalMileage ? `Every ${record.intervalMileage.toLocaleString()} ${settings.distanceUnit}` : null
  ].filter(Boolean).join(" or ");

  return (
    <article className="record-card">
      <div className="record-header">
        <h3>{record.name}</h3>
      </div>
      <p className="record-meta">{intervalDesc || "No interval set"}</p>
      {record.lastServiceDate ? (
        <p>Last done: {formatDate(record.lastServiceDate, settings)}{record.lastServiceOdometer ? ` · ${formatMiles(record.lastServiceOdometer, settings)}` : ""}</p>
      ) : (
        <p className="muted">Not yet recorded for this vehicle.</p>
      )}
      <div className="record-actions">
        <RecordServiceButton record={record} vehicle={vehicle} />
        <ConfirmDelete action={removeAction} label="Remove" />
      </div>
    </article>
  );
}

function RecordServiceButton({ record, vehicle, compact = false }: { record: VehicleServiceInterval; vehicle: Vehicle; compact?: boolean }) {
  const recordAction = recordServiceDoneAction.bind(null, vehicle.id, record.id);
  return (
    <ModalPanel
      trigger={compact ? <Check size={17} /> : <><Check size={17} /> Record service</>}
      triggerClassName={compact ? "icon-button" : undefined}
      triggerLabel={compact ? `Record ${record.name}` : undefined}
      title={`Record ${record.name}`}
    >
      {compact ? <p className="muted sheet-intro">Logs this service in Maintenance and sets the next reminder.</p> : null}
      <form action={recordAction} className="record-form">
        <label>
          Date
          <input name="serviceDate" type="date" defaultValue={todayIso()} required />
        </label>
        <label>
          Odometer
          <input name="serviceOdometer" type="number" min="0" defaultValue={vehicle.effectiveOdometer ?? ""} />
        </label>
        <label>
          Cost
          <input name="cost" type="number" min="0" step="0.01" defaultValue="0" />
        </label>
        <button className="primary-button" type="submit">Save service record</button>
      </form>
    </ModalPanel>
  );
}
