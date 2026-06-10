import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, ExternalLink, Hammer, PackagePlus, Printer, ShieldCheck, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { BackButton } from "@/components/BackButton";
import {
  CompleteReminderButton,
  CreateMaintenanceFromPurchaseForm,
  CreateRepairFromPurchaseForm,
  DebugVehicleForm,
  EditPlannedPurchaseBoughtDateForm,
  EditVehicleForm,
  EditMaintenanceForm,
  EditMotForm,
  EditPlannedPurchaseForm,
  EditReminderForm,
  EditRepairForm,
  MarkPlannedPurchaseBoughtForm,
  MaintenanceForm,
  MileagePill,
  MotForm,
  PlannedPurchaseForm,
  ReminderForm,
  RepairForm
} from "@/components/Forms";
import { ExplosionEffect } from "@/components/ExplosionEffect";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { VehiclePhotoUploadForm } from "@/components/VehiclePhotoUploadForm";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { getCollectionName, getVehicle, getVehicleActivePlannedPurchaseSummary, getVehicleLoggedSpend, listAttachments, listMaintenance, listMaintenanceCategories, listMots, listPlannedPurchases, listReminders, listRepairs, listWorkshops } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { formatCurrency, formatDate, formatMiles, formatMotResult, formatPlannedPurchaseStatus, formatReminderStatus, type MotResult, type PlannedPurchaseStatus, type ReminderStatusLabel } from "@/lib/format";
import { getRegionalSettings } from "@/lib/regional-settings";
import { getReminderStatus } from "@/lib/reminders";
import { AttachmentSection } from "@/components/AttachmentSection";
import { deleteAttachmentAction } from "@/app/actions";

const allTabs = ["overview", "maintenance", "repairs", "mots", "to-buy", "reminders"] as const;
type Tab = (typeof allTabs)[number];

export default async function VehiclePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const vehicleId = Number.parseInt(id, 10);
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) notFound();

  const query = await searchParams;
  const settings = getRegionalSettings();
  const motLabel = settings.motFeature === "emissionsTest" ? "Emissions Test" : "MOT";
  const tabs = settings.motFeature === "disabled"
    ? allTabs.filter((t) => t !== "mots")
    : allTabs;
  const activeTab = (tabs as readonly string[]).includes(query.tab as string) ? (query.tab as Tab) : "overview";
  const maintenance = listMaintenance(vehicle.id);
  const repairs = listRepairs(vehicle.id);
  const mots = listMots(vehicle.id);
  const reminders = listReminders(vehicle.id);
  const plannedPurchases = listPlannedPurchases(vehicle.id);
  const toBuyPurchases = plannedPurchases.filter((record) => !record.purchasedDate);
  const purchasedItems = plannedPurchases.filter((record) => record.purchasedDate);
  const workshops = listWorkshops();
  const categories = listMaintenanceCategories();
  const spent = getVehicleLoggedSpend(vehicle.id);
  const activePlannedSummary = getVehicleActivePlannedPurchaseSummary(vehicle.id);
  const latestMot = mots[0];
  const debugEnabled = debugEasterEggsEnabled();
  const collectionName = getCollectionName();
  const registrationLabel = settings.plateStyle === "us" ? "Plate Number" : "Registration";
  const regMode = settings.plateStyle === "us" ? "us" : "uk";
  const boundDeleteAttachment = deleteAttachmentAction.bind(null, vehicle.id);

  return (
    <AppFrame>
      {debugEnabled ? <ExplosionEffect active={Boolean(vehicle.debugDestroyed)} /> : null}
      <BackButton />
      <section className="vehicle-hero">
        <div className="photo-frame hero-photo-frame">
          <VehiclePhoto src={vehicle.photoPath} alt={`${vehicle.make} ${vehicle.model}`} className="hero-photo" />
          {vehicle.sold ? (
            <span className="photo-sold-badge">
              <BadgeCheck size={14} />
              Sold
            </span>
          ) : null}
        </div>
        <div className="vehicle-hero-copy">
          <Link href="/garage" className="back-link">{collectionName}</Link>
          <RegistrationPlate value={vehicle.registration} className="large" mode={regMode} />
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="hero-meta">
            <MileagePill>{formatMiles(vehicle.effectiveOdometer, settings)}</MileagePill>
            <span className="pill">{vehicle.year ?? "Year unknown"}</span>
            <span className="pill">{formatCurrency(spent, settings)} logged</span>
            {vehicle.purchasePrice ? <span className="pill">{formatCurrency(vehicle.purchasePrice, settings)} paid</span> : null}
          </div>
          {vehicle.notes ? <p>{vehicle.notes}</p> : null}
          <div className="inline-form">
            <VehiclePhotoUploadForm vehicleId={vehicle.id} />
            <Link className="secondary-button" href={`/vehicles/${vehicle.id}/print`}>
              <Printer size={17} />
              Print
            </Link>
            <EditVehicleForm vehicle={vehicle} registrationLabel={registrationLabel} />
            {debugEnabled ? <DebugVehicleForm vehicle={vehicle} /> : null}
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Vehicle sections">
        {tabs.map((tab) => (
          <Link className={activeTab === tab ? "active" : ""} href={`/vehicles/${vehicle.id}?tab=${tab}`} key={tab}>
            {tab === "mots" ? `${motLabel}s` : tab === "to-buy" ? "To Buy" : tab[0].toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="split-grid">
          <div className="list-panel">
            <h2>Snapshot</h2>
            <div className="metric-list">
              {settings.motFeature !== "disabled" ? (
                <>
                  <span>Latest {motLabel}</span>
                  <strong>{latestMot ? formatDate(latestMot.expiryDate, settings) : `No ${motLabel.toLowerCase()} logged`}</strong>
                </>
              ) : null}
              <span>Maintenance entries</span>
              <strong>{maintenance.length}</strong>
              <span>Repair entries</span>
              <strong>{repairs.length}</strong>
              <span>Open reminders</span>
              <strong>{reminders.filter((reminder) => !reminder.completedAt).length}</strong>
              <span>To Buy</span>
              <strong>{activePlannedSummary.count}</strong>
              <span>Upcoming estimate</span>
              <strong>{formatCurrency(activePlannedSummary.estimatedTotal, settings)}</strong>
              <span>Purchase date</span>
              <strong>{formatDate(vehicle.purchaseDate, settings)}</strong>
              <span>Purchase price</span>
              <strong>{vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice, settings) : "Not set"}</strong>
            </div>
          </div>
          <div className="list-panel">
            <h2>Recent activity</h2>
            {[...maintenance.slice(0, 3), ...repairs.slice(0, 3)].length ? (
              [...maintenance.slice(0, 3), ...repairs.slice(0, 3)]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((record) => (
                  <div className="list-row" key={`${"category" in record ? "m" : "r"}-${record.id}`}>
                    <span>{"category" in record ? record.description : record.fault}</span>
                    <strong>{formatDate(record.date, settings)}</strong>
                  </div>
                ))
            ) : <p className="muted">No work logged yet.</p>}
          </div>
        </section>
      ) : null}

      {activeTab === "maintenance" ? (
        <RecordSection
          title="Maintenance"
          icon={<Wrench size={19} />}
          form={<MaintenanceForm vehicleId={vehicle.id} categories={categories} />}
          emptyTitle="No maintenance logged"
          emptyMessage="Add the first service or upkeep entry for this car."
          hasRecords={maintenance.length > 0}
        >
          {maintenance.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className="tag">{record.category}</span><h3>{record.description}</h3></div>
              <p className="record-meta">{formatDate(record.date, settings)} · {formatMiles(record.odometer, settings)}</p>
              <strong>{formatCurrency(record.cost, settings)}</strong>
              {record.notes ? <p>{record.notes}</p> : null}
              <AttachmentSection attachments={listAttachments("maintenance", record.id)} deleteAction={boundDeleteAttachment} recordType="maintenance" recordId={record.id} vehicleId={vehicle.id} />
              <div className="record-actions"><EditMaintenanceForm record={record} categories={categories} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "repairs" ? (
        <RecordSection
          title="Repairs"
          icon={<Hammer size={19} />}
          form={<RepairForm vehicleId={vehicle.id} workshops={workshops} />}
          emptyTitle="No repairs logged"
          emptyMessage="Track faults, fixes, and garage work once they happen."
          hasRecords={repairs.length > 0}
        >
          {repairs.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className="tag">{record.garage ?? "Repair"}</span><h3>{record.fault}</h3></div>
              <p className="record-meta">{formatDate(record.date, settings)} · {formatMiles(record.odometer, settings)}</p>
              <strong>{formatCurrency(record.cost, settings)}</strong>
              {record.notes ? <p>{record.notes}</p> : null}
              <AttachmentSection attachments={listAttachments("repair", record.id)} deleteAction={boundDeleteAttachment} recordType="repair" recordId={record.id} vehicleId={vehicle.id} />
              <div className="record-actions"><EditRepairForm record={record} workshops={workshops} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "mots" ? (
        <RecordSection
          title={`${motLabel}s`}
          icon={<ShieldCheck size={19} />}
          form={<MotForm vehicleId={vehicle.id} motLabel={motLabel} />}
          emptyTitle={`No ${motLabel.toLowerCase()} history yet`}
          emptyMessage={`Add the latest ${motLabel.toLowerCase()} result to start building this vehicle's test record.`}
          hasRecords={mots.length > 0}
        >
          {mots.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className={`tag ${motResultTone(record.result)}`}>{formatMotResult(record.result)}</span><h3>Expires {formatDate(record.expiryDate, settings)}</h3></div>
              <p className="record-meta">Tested {formatDate(record.testDate, settings)} · Mileage: {formatMiles(record.odometer, settings)}</p>
              <strong>{formatCurrency(record.cost, settings)}</strong>
              {record.certificateRef ? <p>Reference: {record.certificateRef}</p> : null}
              {record.advisories ? <p>{record.advisories}</p> : null}
              <AttachmentSection attachments={listAttachments("mot", record.id)} deleteAction={boundDeleteAttachment} recordType="mot" recordId={record.id} vehicleId={vehicle.id} />
              <div className="record-actions"><EditMotForm record={record} motLabel={motLabel} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "reminders" ? (
        <RecordSection
          title="Reminders"
          icon={<CalendarDays size={19} />}
          form={<ReminderForm vehicleId={vehicle.id} />}
          emptyTitle="No reminders set"
          emptyMessage="Create reminders for upcoming jobs, inspections, or mileage milestones."
          hasRecords={reminders.length > 0}
        >
          {reminders.map((record) => {
            const status = getReminderStatus(record, vehicle);
            const reminderDetails = [
              record.dueDate ? `Due ${formatDate(record.dueDate, settings)}` : "No date",
              record.title.toLowerCase() === "mot due" ? null : formatMiles(record.dueOdometer, settings)
            ].filter(Boolean).join(" · ");
            return (
              <article className="record-card reminder-card" key={record.id}>
                <div className="record-header"><span className={`tag ${reminderStatusTone(status)}`}>{formatReminderStatus(status)}</span><h3>{record.title}</h3></div>
                <p className="record-meta">{reminderDetails}</p>
                {record.recurrence ? <p>Repeats {record.recurrence}</p> : null}
                <div className="record-actions">
                  {!record.completedAt ? <CompleteReminderButton vehicleId={vehicle.id} id={record.id} /> : null}
                  <EditReminderForm record={record} />
                </div>
              </article>
            );
          })}
        </RecordSection>
      ) : null}

      {activeTab === "to-buy" ? (
        <RecordSection
          title="To Buy"
          icon={<PackagePlus size={19} />}
          form={<PlannedPurchaseForm vehicleId={vehicle.id} />}
          emptyTitle="No planned purchases"
          emptyMessage="Add parts or supplies you need to buy before the next job."
          hasRecords={plannedPurchases.length > 0}
        >
          <div className="record-subsection">
            <h3>To Buy</h3>
            {toBuyPurchases.length ? toBuyPurchases.map((record) => (
              <article className="record-card to-buy-card" key={record.id}>
                <div className="record-header">
                  <span className="tag tag-neutral">{formatPlannedPurchaseStatus("to-buy")}</span>
                  <h3>{record.itemName}</h3>
                </div>
                <p className="record-meta">Qty {record.quantity}</p>
                <strong>{formatCurrency(record.estimatedCost, settings)}</strong>
                {record.supplier ? <p>{record.supplier}</p> : null}
                {record.url ? (
                  <a className="secondary-button" href={record.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={17} />
                    Open link
                  </a>
                ) : null}
                {record.notes ? <p>{record.notes}</p> : null}
                <div className="record-actions">
                  <MarkPlannedPurchaseBoughtForm record={record} />
                  <EditPlannedPurchaseForm record={record} />
                </div>
              </article>
            )) : <p className="muted">Nothing left to buy.</p>}
          </div>

          <div className="record-subsection">
            <h3>Purchased</h3>
            {purchasedItems.length ? purchasedItems.map((record) => (
              <article className="record-card to-buy-card" key={record.id}>
                <div className="record-header">
                  <span className={`tag ${record.convertedAt ? "tag-success" : "tag-neutral"}`}>
                    {formatPlannedPurchaseStatus(plannedPurchaseStatus(record.convertedAt, record.convertedToType))}
                  </span>
                  <h3>{record.itemName}</h3>
                </div>
                <p className="record-meta">
                  Qty {record.quantity} · Bought {formatDate(record.purchasedDate, settings)}
                  {record.convertedAt ? ` · Logged ${formatDate(record.convertedAt, settings)}` : ""}
                </p>
                <strong>{formatCurrency(record.actualCost ?? record.estimatedCost, settings)}</strong>
                {record.supplier ? <p>{record.supplier}</p> : null}
                {record.url ? (
                  <a className="secondary-button" href={record.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={17} />
                    Open link
                  </a>
                ) : null}
                {record.notes ? <p>{record.notes}</p> : null}
                <div className="record-actions">
                  {!record.convertedAt ? (
                    <>
                      <CreateMaintenanceFromPurchaseForm record={record} categories={categories} />
                      <CreateRepairFromPurchaseForm record={record} workshops={workshops} />
                    </>
                  ) : null}
                  <EditPlannedPurchaseBoughtDateForm record={record} />
                </div>
              </article>
            )) : <p className="muted">Purchased items will appear here once bought.</p>}
          </div>
        </RecordSection>
      ) : null}
    </AppFrame>
  );
}

function motResultTone(result: MotResult) {
  const tones: Record<MotResult, string> = {
    pass: "tag-success",
    fail: "tag-danger",
    advisory: "tag-warning"
  };
  return tones[result];
}

function reminderStatusTone(status: ReminderStatusLabel) {
  const tones: Record<ReminderStatusLabel, string> = {
    done: "tag-success",
    overdue: "tag-danger",
    upcoming: "tag-warning",
    open: "tag-neutral"
  };
  return tones[status];
}

function plannedPurchaseStatus(convertedAt: string | null, convertedToType: "maintenance" | "repair" | null): PlannedPurchaseStatus {
  if (!convertedAt) return "purchased";
  return convertedToType === "repair" ? "logged-as-repair" : "logged-as-maintenance";
}

function RecordSection({
  title,
  icon,
  form,
  children,
  hasRecords,
  emptyTitle,
  emptyMessage
}: {
  title: string;
  icon: React.ReactNode;
  form: React.ReactNode;
  children: React.ReactNode;
  hasRecords: boolean;
  emptyTitle: string;
  emptyMessage: string;
}) {
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2>{icon}{title}</h2>
        {form}
      </div>
      <div className="records-grid">
        {hasRecords ? children : (
          <div className="empty-state records-empty-state">
            <h3>{emptyTitle}</h3>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  );
}
