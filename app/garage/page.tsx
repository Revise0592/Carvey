import Link from "next/link";
import { BadgeCheck, Banknote, CalendarClock, DollarSign, Euro, PackagePlus, PoundSterling, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { CreateVehicleForm } from "@/components/Forms";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { buildAgenda } from "@/lib/agenda";
import { getCollectionName, getDashboardStats } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatMiles } from "@/lib/format";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";

export default async function GaragePage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await requireUser();
  const query = await searchParams;
  const stats = getDashboardStats();
  const collectionName = getCollectionName();
  const settings = getRegionalSettings();
  const regMode = settings.plateStyle;
  const motLabel = getMotLabel(settings);
  const agenda = buildAgenda();
  const nextReminders = agenda.slice(0, 8);

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Your garage</p>
          <h1>{collectionName}</h1>
        </div>
        <CreateVehicleForm registrationLabel="Registration" autoOpenKey={query.new} />
      </section>

      <section className="stats-grid">
        <article className="stat-card stat-card-garage">
          <Wrench size={20} />
          <span>Vehicles</span>
          <strong>{stats.vehicles.length}</strong>
        </article>
        <article className="stat-card stat-card-spend">
          {settings.currency === "USD" ? <DollarSign size={20} /> : settings.currency === "GBP" ? <PoundSterling size={20} /> : settings.currency === "EUR" ? <Euro size={20} /> : <Banknote size={20} />}
          <span>Spent this year</span>
          <strong>{formatCurrency(stats.yearlySpend, settings)}</strong>
        </article>
        <article className="stat-card stat-card-reminders">
          <CalendarClock size={20} />
          <span>Open reminders</span>
          <strong>{agenda.length}</strong>
        </article>
        <article className="stat-card stat-card-reminders">
          <PackagePlus size={20} />
          <span>To Buy</span>
          <strong>{stats.plannedPurchaseCount}</strong>
        </article>
      </section>

      <section className="garage-grid">
        {stats.vehicles.map((vehicle) => (
          <Link className="vehicle-card" href={`/vehicles/${vehicle.id}`} key={vehicle.id}>
            <div className="photo-frame vehicle-card-photo-frame">
              <VehiclePhoto src={vehicle.thumbnailPath} alt={`${vehicle.make} ${vehicle.model}`} />
              {vehicle.sold ? (
                <span className="photo-sold-badge photo-sold-badge-compact">
                  <BadgeCheck size={13} />
                  Sold
                </span>
              ) : null}
            </div>
            <div className="vehicle-card-body">
              <RegistrationPlate value={vehicle.registration} mode={regMode} />
              <h2>{vehicle.make} {vehicle.model}</h2>
              <p>{vehicle.year ?? "Year unknown"} · {formatMiles(vehicle.effectiveOdometer, settings)}</p>
              {vehicle.purchasePrice ? <p>Bought for {formatCurrency(vehicle.purchasePrice, settings)}</p> : null}
            </div>
          </Link>
        ))}
        {stats.vehicles.length === 0 ? (
          <div className="empty-state">
            <h2>No cars yet</h2>
            <p>Add your first vehicle to start logging {settings.motFeature === "disabled" ? "repairs and maintenance" : `${motLabel.toLowerCase()}s, repairs, and maintenance`}.</p>
          </div>
        ) : null}
      </section>

      <section className="dashboard-panels">
        {settings.motFeature !== "disabled" ? (
          <div className="list-panel">
            <div className="panel-heading"><h2>{motLabel}s due soon</h2><Link href="/reminders" className="panel-link">See all</Link></div>
            {stats.upcomingMots.length ? stats.upcomingMots.map((mot) => (
              <Link href={`/vehicles/${mot.vehicleId}?tab=mots`} className="list-row" key={`${mot.vehicleId}-${mot.expiryDate}`}>
                <span className="list-row-text"><span>{mot.make} {mot.model}</span><small>{mot.registration.toUpperCase()}</small></span>
                <strong>{formatDate(mot.expiryDate, settings)}</strong>
              </Link>
            )) : <p className="muted">No {motLabel.toLowerCase()}s due in the next 45 days.</p>}
          </div>
        ) : null}
        <div className="list-panel">
          <div className="panel-heading"><h2>Reminders</h2><Link href="/reminders" className="panel-link">See all</Link></div>
          {nextReminders.length ? nextReminders.map(({ reminder, timing }) => (
            <Link href={`/vehicles/${reminder.vehicleId}?tab=reminders`} className="list-row" key={reminder.id}>
              <span className="list-row-text"><span>{reminder.title}</span><small>{reminder.make} {reminder.model}</small></span>
              <strong>
                {reminder.dueDate && !timing.estimatedDate
                  ? formatDate(reminder.dueDate, settings)
                  : timing.estimatedDate && !timing.probablyReached
                    ? `≈ ${formatDate(timing.estimatedDate, settings)}`
                    : formatMiles(reminder.dueOdometer, settings)}
              </strong>
            </Link>
          )) : <p className="muted">No open reminders.</p>}
        </div>

        <div className="list-panel">
          <h2>To Buy</h2>
          {stats.plannedPurchases.length ? stats.plannedPurchases.map((item) => (
            <Link href={`/vehicles/${item.vehicleId}?tab=to-buy`} className="list-row" key={item.id}>
              <span className="list-row-text"><span>{item.itemName}</span><small>{item.make} {item.model}</small></span>
              <strong>{formatCurrency(item.estimatedCost, settings)}</strong>
            </Link>
          )) : <p className="muted">No planned purchases.</p>}
        </div>
      </section>
    </AppFrame>
  );
}
