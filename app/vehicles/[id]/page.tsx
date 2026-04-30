import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Hammer, Printer, ShieldCheck, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import {
  CompleteReminderButton,
  DeleteVehicleForm,
  DebugVehicleForm,
  EditVehicleForm,
  EditMaintenanceForm,
  EditMotForm,
  EditReminderForm,
  EditRepairForm,
  MaintenanceForm,
  MileagePill,
  MotForm,
  ReminderForm,
  RepairForm
} from "@/components/Forms";
import { ExplosionEffect } from "@/components/ExplosionEffect";
import { VehiclePhotoUploadForm } from "@/components/VehiclePhotoUploadForm";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { getVehicle, listMaintenance, listMots, listReminders, listRepairs } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { formatCurrency, formatDate, formatMiles } from "@/lib/format";
import { getReminderStatus } from "@/lib/reminders";

const tabs = ["overview", "maintenance", "repairs", "mots", "reminders"] as const;
type Tab = (typeof tabs)[number];

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
  const activeTab = tabs.includes(query.tab as Tab) ? (query.tab as Tab) : "overview";
  const maintenance = listMaintenance(vehicle.id);
  const repairs = listRepairs(vehicle.id);
  const mots = listMots(vehicle.id);
  const reminders = listReminders(vehicle.id);
  const spent = [...maintenance, ...repairs, ...mots].reduce((total, record) => total + record.cost, 0);
  const latestMot = mots[0];
  const debugEnabled = debugEasterEggsEnabled();

  return (
    <AppFrame>
      {debugEnabled ? <ExplosionEffect active={Boolean(vehicle.debugDestroyed)} /> : null}
      <section className="vehicle-hero">
        <VehiclePhoto src={vehicle.photoPath} alt={`${vehicle.make} ${vehicle.model}`} className="hero-photo" />
        <div className="vehicle-hero-copy">
          <Link href="/garage" className="back-link">Garage</Link>
          <span className="reg">{vehicle.registration}</span>
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="hero-meta">
            <MileagePill>{formatMiles(vehicle.currentOdometer)}</MileagePill>
            <span className="pill">{vehicle.year ?? "Year unknown"}</span>
            <span className="pill">{formatCurrency(spent)} logged</span>
            {vehicle.purchasePrice ? <span className="pill">{formatCurrency(vehicle.purchasePrice)} paid</span> : null}
          </div>
          {vehicle.notes ? <p>{vehicle.notes}</p> : null}
          <div className="inline-form">
            <VehiclePhotoUploadForm vehicleId={vehicle.id} />
            <Link className="secondary-button" href={`/vehicles/${vehicle.id}/print`}>
              <Printer size={17} />
              Print
            </Link>
            <EditVehicleForm vehicle={vehicle} />
            {debugEnabled ? <DebugVehicleForm vehicle={vehicle} /> : null}
            <DeleteVehicleForm vehicle={vehicle} />
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="Vehicle sections">
        {tabs.map((tab) => (
          <Link className={activeTab === tab ? "active" : ""} href={`/vehicles/${vehicle.id}?tab=${tab}`} key={tab}>
            {tab === "mots" ? "MOTs" : tab[0].toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="split-grid">
          <div className="list-panel">
            <h2>Snapshot</h2>
            <div className="metric-list">
              <span>Latest MOT</span>
              <strong>{latestMot ? formatDate(latestMot.expiryDate) : "No MOT logged"}</strong>
              <span>Maintenance entries</span>
              <strong>{maintenance.length}</strong>
              <span>Repair entries</span>
              <strong>{repairs.length}</strong>
              <span>Open reminders</span>
              <strong>{reminders.filter((reminder) => !reminder.completedAt).length}</strong>
              <span>Purchase date</span>
              <strong>{formatDate(vehicle.purchaseDate)}</strong>
              <span>Purchase price</span>
              <strong>{vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice) : "Not set"}</strong>
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
                    <strong>{formatDate(record.date)}</strong>
                  </div>
                ))
            ) : <p className="muted">No work logged yet.</p>}
          </div>
        </section>
      ) : null}

      {activeTab === "maintenance" ? (
        <RecordSection title="Maintenance" icon={<Wrench size={19} />} form={<MaintenanceForm vehicleId={vehicle.id} />}>
          {maintenance.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className="tag">{record.category}</span><h3>{record.description}</h3></div>
              <p className="record-meta">{formatDate(record.date)} · {formatMiles(record.odometer)}</p>
              <strong>{formatCurrency(record.cost)}</strong>
              {record.notes ? <p>{record.notes}</p> : null}
              <div className="record-actions"><EditMaintenanceForm record={record} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "repairs" ? (
        <RecordSection title="Repairs" icon={<Hammer size={19} />} form={<RepairForm vehicleId={vehicle.id} />}>
          {repairs.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className="tag">{record.garage ?? "Repair"}</span><h3>{record.fault}</h3></div>
              <p className="record-meta">{formatDate(record.date)} · {formatMiles(record.odometer)}</p>
              <strong>{formatCurrency(record.cost)}</strong>
              {record.notes ? <p>{record.notes}</p> : null}
              <div className="record-actions"><EditRepairForm record={record} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "mots" ? (
        <RecordSection title="MOTs" icon={<ShieldCheck size={19} />} form={<MotForm vehicleId={vehicle.id} />}>
          {mots.map((record) => (
            <article className="record-card" key={record.id}>
              <div className="record-header"><span className={`tag ${record.result}`}>{record.result}</span><h3>Expires {formatDate(record.expiryDate)}</h3></div>
              <p className="record-meta">Tested {formatDate(record.testDate)} · Mileage at test: {formatMiles(record.odometer)}</p>
              <strong>{formatCurrency(record.cost)}</strong>
              {record.certificateRef ? <p>Reference: {record.certificateRef}</p> : null}
              {record.advisories ? <p>{record.advisories}</p> : null}
              <div className="record-actions"><EditMotForm record={record} /></div>
            </article>
          ))}
        </RecordSection>
      ) : null}

      {activeTab === "reminders" ? (
        <RecordSection title="Reminders" icon={<CalendarDays size={19} />} form={<ReminderForm vehicleId={vehicle.id} />}>
          {reminders.map((record) => {
            const status = getReminderStatus(record, vehicle);
            const reminderDetails = [
              record.dueDate ? `Due ${formatDate(record.dueDate)}` : "No date",
              record.title.toLowerCase() === "mot due" ? null : formatMiles(record.dueOdometer)
            ].filter(Boolean).join(" · ");
            return (
              <article className="record-card reminder-card" key={record.id}>
                <div className="record-header"><span className={`tag ${status}`}>{status}</span><h3>{record.title}</h3></div>
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
    </AppFrame>
  );
}

function RecordSection({
  title,
  icon,
  form,
  children
}: {
  title: string;
  icon: React.ReactNode;
  form: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2>{icon}{title}</h2>
        {form}
      </div>
      <div className="records-grid">
        {children}
      </div>
    </section>
  );
}
