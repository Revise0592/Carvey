import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Check, ExternalLink, Fuel, Hammer, Images, PackagePlus, Plus, Printer, RefreshCw, ShieldCheck, Trash2, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { BackButton } from "@/components/BackButton";
import {
  CompleteReminderButton,
  CreateMaintenanceFromPurchaseForm,
  CreateRepairFromPurchaseForm,
  DebugVehicleForm,
  EditFuelRecordForm,
  EditPlannedPurchaseBoughtDateForm,
  EditVehicleForm,
  EditMaintenanceForm,
  EditMotForm,
  EditPlannedPurchaseForm,
  EditReminderForm,
  EditRepairForm,
  FuelRecordForm,
  GalleryUploadForm,
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
import { getCollectionName, getVehicle, getVehicleActivePlannedPurchaseSummary, getVehicleLoggedSpend, listAllAttachmentsForVehicle, listAttachments, listFuelRecords, listMaintenance, listMaintenanceCategories, listMots, listPlannedPurchases, listReminders, listRepairs, listServiceIntervals, listVehicleServiceIntervals, listVehicleGalleryPhotos, listWorkshops, type FuelRecord, type GalleryPhoto, type ServiceInterval, type Vehicle, type VehicleServiceInterval } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { computeAverageFuelEconomy, computeFuelEconomies, formatCurrency, formatDate, formatMiles, formatMotResult, formatPlannedPurchaseStatus, formatReminderStatus, formatVolume, todayIso, type MotResult, type PlannedPurchaseStatus, type ReminderStatusLabel } from "@/lib/format";
import { getRegionalSettings, type RegionalSettings } from "@/lib/regional-settings";
import { getReminderStatus } from "@/lib/reminders";
import { AttachmentSection } from "@/components/AttachmentSection";
import { ModalPanel } from "@/components/ModalPanel";
import { assignServiceIntervalAction, deleteAttachmentAction, deleteGalleryPhotoAction, recordServiceDoneAction, removeVehicleServiceIntervalAction } from "@/app/actions";
import { GalleryGrid, type GalleryItem } from "@/components/GalleryGrid";
import { ConfirmDelete } from "@/components/ConfirmDelete";

const allTabs = ["overview", "maintenance", "repairs", "mots", "to-buy", "reminders", "service-plan", "fuel", "gallery"] as const;
type Tab = (typeof allTabs)[number];

export default async function VehiclePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; sort?: string; dir?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const vehicleId = Number.parseInt(id, 10);
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) notFound();

  const query = await searchParams;
  const settings = getRegionalSettings();
  const motLabel = settings.motFeature === "emissionsTest" ? "Emissions Test" : "MOT";
  const tabs = allTabs
    .filter((t) => t !== "mots" || settings.motFeature !== "disabled")
    .filter((t) => t !== "fuel" || !settings.fuelDisabled);
  const activeTab = (tabs as readonly string[]).includes(query.tab as string) ? (query.tab as Tab) : "overview";
  const maintenance = listMaintenance(vehicle.id);
  const repairs = listRepairs(vehicle.id);
  const mots = listMots(vehicle.id);
  const reminders = listReminders(vehicle.id);
  const fuelRecords = listFuelRecords(vehicle.id);
  const avgFuelEconomy = computeAverageFuelEconomy(fuelRecords, settings);
  const allAttachments = activeTab === "gallery" ? listAllAttachmentsForVehicle(vehicle.id) : [];
  const galleryPhotos = activeTab === "gallery" ? listVehicleGalleryPhotos(vehicle.id) : [];
  const vehicleServiceIntervals = listVehicleServiceIntervals(vehicle.id);
  const allServiceIntervals = listServiceIntervals();
  const unassignedIntervals = allServiceIntervals.filter(
    (si) => !vehicleServiceIntervals.some((vsi) => vsi.serviceIntervalId === si.id)
  );
  const linkedReminderIds = new Set(
    vehicleServiceIntervals.filter((v) => v.reminderId !== null).map((v) => v.reminderId!)
  );
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
  const registrationLabel = "Registration";
  const regMode = settings.plateStyle;
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
          <RegistrationPlate value={vehicle.registration} mode={regMode} />
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
          <Link className={activeTab === tab ? "active" : ""} href={`/vehicles/${vehicle.id}?tab=${tab}`} key={tab} scroll={false}>
            {tab === "mots" ? `${motLabel}s` : tab === "to-buy" ? "To Buy" : tab === "service-plan" ? "Service Plan" : tab === "fuel" ? "Fuel" : tab === "gallery" ? "Gallery" : tab[0].toUpperCase() + tab.slice(1)}
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
              {!settings.fuelDisabled && avgFuelEconomy ? (
                <>
                  <span>Avg. economy</span>
                  <strong>{avgFuelEconomy}</strong>
                </>
              ) : null}
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

      {activeTab === "maintenance" ? (() => {
        const sort = query.sort || "date";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const sorted = [...maintenance].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "cost") return m * (a.cost - b.cost);
          if (sort === "category") return m * a.category.localeCompare(b.category);
          return m * a.date.localeCompare(b.date);
        });
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><Wrench size={19} /> Maintenance</h2>
              <MaintenanceForm vehicleId={vehicle.id} categories={categories} />
            </div>
            {maintenance.length > 0 ? (
              <>
                <SortBar vehicleId={vehicle.id} tab="maintenance" activeSort={sort} activeDir={dir} options={[
                  { key: "date", label: "Date" },
                  { key: "cost", label: "Cost" },
                  { key: "category", label: "Category" },
                ]} />
                <div className="record-list">
                  {sorted.map((record) => (
                    <div className="record-entry" key={record.id}>
                      <div className="record-row">
                        <span className="tag">{record.category}</span>
                        <div className="record-row-content">
                          <strong>{record.description}</strong>
                          <p className="record-row-meta">{formatDate(record.date, settings)} · {formatMiles(record.odometer, settings)}</p>
                        </div>
                        <strong className="record-row-value">{formatCurrency(record.cost, settings)}</strong>
                        <div className="record-row-actions">
                          <EditMaintenanceForm record={record} categories={categories} />
                        </div>
                      </div>
                      <AttachmentSection attachments={listAttachments("maintenance", record.id)} deleteAction={boundDeleteAttachment} recordType="maintenance" recordId={record.id} vehicleId={vehicle.id} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No maintenance logged</h3>
                <p>Add the first service or upkeep entry for this car.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "repairs" ? (() => {
        const sort = query.sort || "date";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const sorted = [...repairs].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "cost") return m * (a.cost - b.cost);
          return m * a.date.localeCompare(b.date);
        });
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><Hammer size={19} /> Repairs</h2>
              <RepairForm vehicleId={vehicle.id} workshops={workshops} />
            </div>
            {repairs.length > 0 ? (
              <>
                <SortBar vehicleId={vehicle.id} tab="repairs" activeSort={sort} activeDir={dir} options={[
                  { key: "date", label: "Date" },
                  { key: "cost", label: "Cost" },
                ]} />
                <div className="record-list">
                  {sorted.map((record) => (
                    <div className="record-entry" key={record.id}>
                      <div className="record-row">
                        <span className="tag">{record.garage ?? "Repair"}</span>
                        <div className="record-row-content">
                          <strong>{record.fault}</strong>
                          <p className="record-row-meta">{formatDate(record.date, settings)} · {formatMiles(record.odometer, settings)}</p>
                        </div>
                        <strong className="record-row-value">{formatCurrency(record.cost, settings)}</strong>
                        <div className="record-row-actions">
                          <EditRepairForm record={record} workshops={workshops} />
                        </div>
                      </div>
                      <AttachmentSection attachments={listAttachments("repair", record.id)} deleteAction={boundDeleteAttachment} recordType="repair" recordId={record.id} vehicleId={vehicle.id} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No repairs logged</h3>
                <p>Track faults, fixes, and garage work once they happen.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "mots" ? (() => {
        const sort = query.sort || "expiry";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const sorted = [...mots].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "testDate") return m * a.testDate.localeCompare(b.testDate);
          if (sort === "cost") return m * (a.cost - b.cost);
          return m * a.expiryDate.localeCompare(b.expiryDate);
        });
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><ShieldCheck size={19} /> {motLabel}s</h2>
              <MotForm vehicleId={vehicle.id} motLabel={motLabel} />
            </div>
            {mots.length > 0 ? (
              <>
                <SortBar vehicleId={vehicle.id} tab="mots" activeSort={sort} activeDir={dir} options={[
                  { key: "expiry", label: "Expiry date" },
                  { key: "testDate", label: "Test date" },
                  { key: "cost", label: "Cost" },
                ]} />
                <div className="record-list">
                  {sorted.map((record) => (
                    <div className="record-entry" key={record.id}>
                      <div className="record-row">
                        <span className={`tag ${motResultTone(record.result)}`}>{formatMotResult(record.result)}</span>
                        <div className="record-row-content">
                          <strong>Expires {formatDate(record.expiryDate, settings)}</strong>
                          <p className="record-row-meta">Tested {formatDate(record.testDate, settings)} · {formatMiles(record.odometer, settings)}</p>
                        </div>
                        <strong className="record-row-value">{formatCurrency(record.cost, settings)}</strong>
                        <div className="record-row-actions">
                          <EditMotForm record={record} motLabel={motLabel} />
                        </div>
                      </div>
                      <AttachmentSection attachments={listAttachments("mot", record.id)} deleteAction={boundDeleteAttachment} recordType="mot" recordId={record.id} vehicleId={vehicle.id} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No {motLabel.toLowerCase()} history yet</h3>
                <p>Add the latest {motLabel.toLowerCase()} result to start building this vehicle&apos;s test record.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "reminders" ? (() => {
        const statusOrder: Record<string, number> = { overdue: 0, upcoming: 1, open: 2, done: 3 };
        const sort = query.sort || "status";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const withStatus = reminders.map((r) => ({ record: r, status: getReminderStatus(r, vehicle) }));
        const sorted = [...withStatus].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "dueDate") {
            const ad = a.record.dueDate ?? "9999";
            const bd = b.record.dueDate ?? "9999";
            return m * ad.localeCompare(bd);
          }
          return m * ((statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4));
        });
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><CalendarDays size={19} /> Reminders</h2>
              <ReminderForm vehicleId={vehicle.id} />
            </div>
            {reminders.length > 0 ? (
              <>
                <SortBar vehicleId={vehicle.id} tab="reminders" activeSort={sort} activeDir={dir} options={[
                  { key: "status", label: "Status" },
                  { key: "dueDate", label: "Due date" },
                ]} />
                <div className="record-list">
                  {sorted.map(({ record, status }) => {
                    const reminderMeta = [
                      record.dueDate ? `Due ${formatDate(record.dueDate, settings)}` : "No date set",
                      record.title.toLowerCase() === "mot due" ? null : formatMiles(record.dueOdometer, settings),
                      record.recurrence ? `Repeats ${record.recurrence}` : null,
                    ].filter(Boolean).join(" · ");
                    return (
                      <div className="record-entry" key={record.id}>
                        <div className="record-row">
                          <span className={`tag ${reminderStatusTone(status)}`}>{formatReminderStatus(status)}</span>
                          <div className="record-row-content">
                            <strong>{record.title}</strong>
                            <p className="record-row-meta">{reminderMeta}</p>
                          </div>
                          <div className="record-row-actions">
                            {!record.completedAt ? <CompleteReminderButton vehicleId={vehicle.id} id={record.id} /> : null}
                            <EditReminderForm record={record} isLinked={linkedReminderIds.has(record.id)} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No reminders set</h3>
                <p>Create reminders for upcoming jobs, inspections, or mileage milestones.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "service-plan" ? (
        <section className="records-shell">
          <div className="section-heading">
            <h2><RefreshCw size={19} />Service Plan</h2>
            {unassignedIntervals.length > 0 ? (
              <AssignServiceIntervalForm vehicleId={vehicle.id} intervals={unassignedIntervals} />
            ) : null}
          </div>
          <div className="records-grid">
            {vehicleServiceIntervals.length ? (
              vehicleServiceIntervals.map((record) => (
                <ServicePlanCard key={record.id} record={record} vehicle={vehicle} settings={settings} />
              ))
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No services scheduled</h3>
                <p>
                  {allServiceIntervals.length
                    ? "Assign a service interval to start tracking this vehicle's service plan."
                    : "Define service intervals in Settings first, then assign them here."}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "to-buy" ? (() => {
        const sort = query.sort || "dueDate";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const sortToBuy = <T extends { dueDate: string | null; estimatedCost: number; itemName: string }>(arr: T[]) =>
          [...arr].sort((a, b) => {
            const m = dir === "asc" ? 1 : -1;
            if (sort === "cost") return m * (a.estimatedCost - b.estimatedCost);
            if (sort === "itemName") return m * a.itemName.localeCompare(b.itemName);
            const ad = a.dueDate ?? "9999";
            const bd = b.dueDate ?? "9999";
            return m * ad.localeCompare(bd);
          });
        const sortedToBuy = sortToBuy(toBuyPurchases);
        const sortedPurchased = [...purchasedItems].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "cost") return m * ((a.actualCost ?? a.estimatedCost) - (b.actualCost ?? b.estimatedCost));
          if (sort === "itemName") return m * a.itemName.localeCompare(b.itemName);
          const ad = a.purchasedDate ?? "9999";
          const bd = b.purchasedDate ?? "9999";
          return m * ad.localeCompare(bd);
        });
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><PackagePlus size={19} /> To Buy</h2>
              <PlannedPurchaseForm vehicleId={vehicle.id} />
            </div>
            {plannedPurchases.length > 0 ? (
              <>
                <SortBar vehicleId={vehicle.id} tab="to-buy" activeSort={sort} activeDir={dir} options={[
                  { key: "dueDate", label: "Due date" },
                  { key: "cost", label: "Cost" },
                  { key: "itemName", label: "Name" },
                ]} />
                <div className="record-list">
                  <p className="record-list-subheading">To Buy</p>
                  {sortedToBuy.length ? sortedToBuy.map((record) => (
                    <div className="record-entry" key={record.id}>
                      <div className="record-row">
                        <span className="tag tag-neutral">{formatPlannedPurchaseStatus("to-buy")}</span>
                        <div className="record-row-content">
                          <strong>{record.itemName}</strong>
                          <p className="record-row-meta">
                            {[
                              `Qty ${record.quantity}`,
                              record.supplier,
                              record.dueDate ? `Due ${formatDate(record.dueDate, settings)}` : null,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <strong className="record-row-value">{formatCurrency(record.estimatedCost, settings)}</strong>
                        <div className="record-row-actions">
                          {record.url ? <a className="secondary-button" href={record.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a> : null}
                          <MarkPlannedPurchaseBoughtForm record={record} />
                          <EditPlannedPurchaseForm record={record} />
                        </div>
                      </div>
                    </div>
                  )) : <p className="record-row-meta" style={{ padding: "0.85rem 0" }}>Nothing left to buy.</p>}

                  <p className="record-list-subheading">Purchased</p>
                  {sortedPurchased.length ? sortedPurchased.map((record) => (
                    <div className="record-entry" key={record.id}>
                      <div className="record-row">
                        <span className={`tag ${record.convertedAt ? "tag-success" : "tag-neutral"}`}>
                          {formatPlannedPurchaseStatus(plannedPurchaseStatus(record.convertedAt, record.convertedToType))}
                        </span>
                        <div className="record-row-content">
                          <strong>{record.itemName}</strong>
                          <p className="record-row-meta">
                            {[
                              `Qty ${record.quantity}`,
                              record.purchasedDate ? `Bought ${formatDate(record.purchasedDate, settings)}` : null,
                              record.supplier,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <strong className="record-row-value">{formatCurrency(record.actualCost ?? record.estimatedCost, settings)}</strong>
                        <div className="record-row-actions">
                          {record.url ? <a className="secondary-button" href={record.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a> : null}
                          {!record.convertedAt ? (
                            <>
                              <CreateMaintenanceFromPurchaseForm record={record} categories={categories} />
                              <CreateRepairFromPurchaseForm record={record} workshops={workshops} />
                            </>
                          ) : null}
                          <EditPlannedPurchaseBoughtDateForm record={record} />
                        </div>
                      </div>
                    </div>
                  )) : <p className="record-row-meta" style={{ padding: "0.85rem 0" }}>Purchased items will appear here once bought.</p>}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No planned purchases</h3>
                <p>Add parts or supplies you need to buy before the next job.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "fuel" ? (() => {
        const sort = query.sort || "date";
        const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
        const sorted = [...fuelRecords].sort((a, b) => {
          const m = dir === "asc" ? 1 : -1;
          if (sort === "cost") return m * ((a.totalCost ?? 0) - (b.totalCost ?? 0));
          if (sort === "odometer") return m * (a.odometer - b.odometer);
          return m * a.date.localeCompare(b.date);
        });
        const economies = computeFuelEconomies(fuelRecords, settings);
        const totalFuelSpend = fuelRecords.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><Fuel size={19} /> Fuel</h2>
              <FuelRecordForm vehicleId={vehicle.id} settings={settings} />
            </div>
            {fuelRecords.length > 0 ? (
              <>
                <div className="metric-list" style={{ marginBottom: "1rem" }}>
                  <span>Fill-ups logged</span>
                  <strong>{fuelRecords.length}</strong>
                  <span>Total fuel spend</span>
                  <strong>{formatCurrency(totalFuelSpend, settings)}</strong>
                  <span>Avg. economy</span>
                  <strong>{avgFuelEconomy ?? "—"}</strong>
                </div>
                <SortBar vehicleId={vehicle.id} tab="fuel" activeSort={sort} activeDir={dir} options={[
                  { key: "date", label: "Date" },
                  { key: "cost", label: "Cost" },
                  { key: "odometer", label: "Odometer" },
                ]} />
                <div className="record-list">
                  {sorted.map((record) => {
                    const economy = economies.get(record.id);
                    return (
                      <div className="record-entry" key={record.id}>
                        <div className="record-row">
                          <span className="tag tag-neutral">{record.fuelType}</span>
                          <div className="record-row-content">
                            <strong>
                              {formatVolume(record.volumeLitres, settings)}
                              {record.station ? ` · ${record.station}` : ""}
                            </strong>
                            <p className="record-row-meta">
                              {formatDate(record.date, settings)} · {formatMiles(record.odometer, settings)}
                              {!record.fullTank ? " · Partial" : ""}
                              {economy ? ` · ${economy}` : ""}
                            </p>
                          </div>
                          {record.totalCost != null ? (
                            <strong className="record-row-value">{formatCurrency(record.totalCost, settings)}</strong>
                          ) : null}
                          <div className="record-row-actions">
                            <EditFuelRecordForm record={record} settings={settings} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No fuel logged</h3>
                <p>Log fill-ups to track spend and fuel economy over time.</p>
              </div>
            )}
          </section>
        );
      })() : null}

      {activeTab === "gallery" ? (() => {
        const imageAttachments = allAttachments.filter(a =>
          ["image/jpeg", "image/png", "image/webp"].includes(a.mimeType)
        );
        const maintenanceMap = new Map(maintenance.map(m => [m.id, m]));
        const repairsMap = new Map(repairs.map(r => [r.id, r]));
        const motsMap = new Map(mots.map(m => [m.id, m]));
        const boundDeleteGalleryPhoto = deleteGalleryPhotoAction.bind(null, vehicle.id);

        type GalleryEntry =
          | { kind: "attachment"; data: (typeof imageAttachments)[number] }
          | { kind: "gallery"; data: GalleryPhoto };
        const entries: GalleryEntry[] = [
          ...imageAttachments.map(a => ({ kind: "attachment" as const, data: a })),
          ...galleryPhotos.map(p => ({ kind: "gallery" as const, data: p })),
        ].sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));

        function resolveRecord(recordType: string | null, recordId: number | null) {
          if (recordType === "maintenance" && recordId) {
            const r = maintenanceMap.get(recordId);
            return { description: r?.description ?? "", date: r?.date ?? "", tab: "maintenance" };
          }
          if (recordType === "repair" && recordId) {
            const r = repairsMap.get(recordId);
            return { description: r?.fault ?? "", date: r?.date ?? "", tab: "repairs" };
          }
          if (recordType === "mot" && recordId) {
            const r = motsMap.get(recordId);
            return { description: r ? formatMotResult(r.result as MotResult) : "", date: r?.testDate ?? "", tab: "mots" };
          }
          return { description: "", date: "", tab: "" };
        }

        const galleryItems: GalleryItem[] = entries.map((entry) => {
          const { description, date, tab } = resolveRecord(
            entry.data.recordType ?? null,
            entry.kind === "attachment" ? entry.data.recordId : (entry.data.recordId ?? null)
          );
          return {
            id: `${entry.kind}-${entry.data.id}`,
            filePath: entry.data.filePath,
            originalFilename: entry.data.originalFilename,
            caption: entry.kind === "gallery" ? entry.data.caption : null,
            recordType: entry.data.recordType ?? null,
            recordDescription: description,
            recordDate: date ? formatDate(date, settings) : "",
            recordTab: tab,
            isStandalone: entry.kind === "gallery",
            photoId: entry.kind === "gallery" ? entry.data.id : null,
          };
        });

        return (
          <section className="records-shell">
            <div className="section-heading">
              <h2><Images size={19} /> Gallery</h2>
              <GalleryUploadForm vehicleId={vehicle.id} maintenance={maintenance} repairs={repairs} />
            </div>
            {galleryItems.length > 0 ? (
              <GalleryGrid items={galleryItems} vehicleId={vehicle.id} deleteAction={boundDeleteGalleryPhoto} />
            ) : (
              <div className="empty-state records-empty-state">
                <h3>No photos yet</h3>
                <p>Upload photos directly, or attach images to repair and maintenance records.</p>
              </div>
            )}
          </section>
        );
      })() : null}
    </AppFrame>
  );
}

function AssignServiceIntervalForm({ vehicleId, intervals }: { vehicleId: number; intervals: ServiceInterval[] }) {
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
                {si.intervalMileage ? ` / ${si.intervalMileage.toLocaleString()} miles` : ""}
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
  const recordAction = recordServiceDoneAction.bind(null, vehicle.id, record.id);
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
        <ModalPanel trigger={<><Check size={17} /> Record service</>} title={`Record ${record.name}`}>
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
        <ConfirmDelete action={removeAction} label="Remove" />
      </div>
    </article>
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

function SortBar({ vehicleId, tab, options, activeSort, activeDir }: {
  vehicleId: number;
  tab: string;
  options: { key: string; label: string }[];
  activeSort: string;
  activeDir: "asc" | "desc";
}) {
  return (
    <div className="sort-bar">
      <span>Sort:</span>
      {options.map(({ key, label }) => {
        const isActive = activeSort === key;
        const nextDir = isActive && activeDir === "desc" ? "asc" : "desc";
        const indicator = isActive ? (activeDir === "desc" ? " ↓" : " ↑") : "";
        return (
          <Link key={key} href={`/vehicles/${vehicleId}?tab=${tab}&sort=${key}&dir=${nextDir}`} className={isActive ? "active" : ""} scroll={false}>
            {label}{indicator}
          </Link>
        );
      })}
    </div>
  );
}
