import Link from "next/link";
import { BadgeCheck, CalendarClock, PackagePlus, PoundSterling, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { CreateVehicleForm } from "@/components/Forms";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { getCollectionName, getDashboardStats } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatMiles } from "@/lib/format";

export default async function GaragePage() {
  await requireUser();
  const stats = getDashboardStats();
  const collectionName = getCollectionName();

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>{collectionName}</h1>
        </div>
        <CreateVehicleForm />
      </section>

      <section className="stats-grid">
        <article className="stat-card stat-card-garage">
          <Wrench size={20} />
          <span>Vehicles</span>
          <strong>{stats.vehicles.length}</strong>
        </article>
        <article className="stat-card stat-card-spend">
          <PoundSterling size={20} />
          <span>Spent this year</span>
          <strong>{formatCurrency(stats.yearlySpend)}</strong>
        </article>
        <article className="stat-card stat-card-reminders">
          <CalendarClock size={20} />
          <span>Open reminders</span>
          <strong>{stats.reminders.length}</strong>
        </article>
        <article className="stat-card stat-card-reminders">
          <PackagePlus size={20} />
          <span>To buy</span>
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
              <RegistrationPlate value={vehicle.registration} />
              <h2>{vehicle.make} {vehicle.model}</h2>
              <p>{vehicle.year ?? "Year unknown"} · {formatMiles(vehicle.effectiveOdometer)}</p>
              {vehicle.purchasePrice ? <p>Bought for {formatCurrency(vehicle.purchasePrice)}</p> : null}
            </div>
          </Link>
        ))}
        {stats.vehicles.length === 0 ? (
          <div className="empty-state">
            <h2>No cars yet</h2>
            <p>Add your first vehicle to start logging MOTs, repairs, and maintenance.</p>
          </div>
        ) : null}
      </section>

      <section className="dashboard-panels">
        <div className="list-panel">
          <h2>MOTs due soon</h2>
          {stats.upcomingMots.length ? stats.upcomingMots.map((mot) => (
            <Link href={`/vehicles/${mot.vehicleId}?tab=mots`} className="list-row" key={`${mot.vehicleId}-${mot.expiryDate}`}>
              <span>{mot.make} {mot.model}</span>
              <strong>{formatDate(mot.expiryDate)}</strong>
            </Link>
          )) : <p className="muted">No MOTs due in the next 45 days.</p>}
        </div>
        <div className="list-panel">
          <h2>Reminders</h2>
          {stats.reminders.length ? stats.reminders.map((reminder) => (
            <Link href={`/vehicles/${reminder.vehicleId}?tab=reminders`} className="list-row" key={reminder.id}>
              <span>{reminder.title} · {reminder.make} {reminder.model}</span>
              <strong>{reminder.dueDate ? formatDate(reminder.dueDate) : formatMiles(reminder.dueOdometer)}</strong>
            </Link>
          )) : <p className="muted">No open reminders.</p>}
        </div>

        <div className="list-panel">
          <h2>To buy</h2>
          {stats.plannedPurchases.length ? stats.plannedPurchases.map((item) => (
            <Link href={`/vehicles/${item.vehicleId}?tab=to-buy`} className="list-row" key={item.id}>
              <span>{item.itemName} · {item.make} {item.model}</span>
              <strong>{formatCurrency(item.estimatedCost)}</strong>
            </Link>
          )) : <p className="muted">No planned purchases.</p>}
        </div>
      </section>
    </AppFrame>
  );
}
