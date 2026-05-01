import Link from "next/link";
import { CalendarClock, Plus, PoundSterling, Wrench } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { createVehicleAction } from "@/app/actions";
import { getDashboardStats } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatMiles } from "@/lib/format";

export default async function GaragePage() {
  await requireUser();
  const stats = getDashboardStats();

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Your garage</p>
          <h1>Garage</h1>
        </div>
        <details className="add-vehicle">
          <summary><Plus size={17} /> Add vehicle</summary>
          <form action={createVehicleAction} className="record-form floating-form">
            <input name="make" placeholder="Make" required />
            <input name="model" placeholder="Model" required />
            <input name="year" type="number" min="1886" max="2100" placeholder="Year" />
            <input name="registration" placeholder="Registration" required />
            <input name="vin" placeholder="VIN" />
            <input name="currentOdometer" type="number" min="0" placeholder="Current mileage" />
            <input name="purchasePrice" type="number" min="0" step="0.01" placeholder="Purchase price" />
            <input name="purchaseDate" type="date" aria-label="Purchase date" />
            <textarea name="notes" placeholder="Notes" />
            <button className="primary-button" type="submit">Create vehicle</button>
          </form>
        </details>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <Wrench size={20} />
          <span>Vehicles</span>
          <strong>{stats.vehicles.length}</strong>
        </article>
        <article className="stat-card">
          <PoundSterling size={20} />
          <span>Spent this year</span>
          <strong>{formatCurrency(stats.yearlySpend)}</strong>
        </article>
        <article className="stat-card">
          <CalendarClock size={20} />
          <span>Open reminders</span>
          <strong>{stats.reminders.length}</strong>
        </article>
      </section>

      <section className="garage-grid">
        {stats.vehicles.map((vehicle) => (
          <Link className="vehicle-card" href={`/vehicles/${vehicle.id}`} key={vehicle.id}>
            <VehiclePhoto src={vehicle.thumbnailPath} alt={`${vehicle.make} ${vehicle.model}`} />
            <div className="vehicle-card-body">
              <RegistrationPlate value={vehicle.registration} />
              <h2>{vehicle.make} {vehicle.model}</h2>
              <p>{vehicle.year ?? "Year unknown"} · {formatMiles(vehicle.currentOdometer)}</p>
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

      <section className="split-grid">
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
              <span>{reminder.title}</span>
              <strong>{reminder.dueDate ? formatDate(reminder.dueDate) : formatMiles(reminder.dueOdometer)}</strong>
            </Link>
          )) : <p className="muted">No open reminders.</p>}
        </div>
      </section>
    </AppFrame>
  );
}
