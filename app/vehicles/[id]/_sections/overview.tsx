import { getDb, listFuelRecords, listOdometerReadings, listRenewals, getVehicleActivePlannedPurchaseSummary } from "@/lib/db";
import { computeAverageFuelEconomy, formatCurrency, formatDate, formatMiles } from "@/lib/format";
import { annualDistance, estimateMileageRate, estimateOdometerOn } from "@/lib/mileage";
import { renewalTypeLabels } from "@/lib/renewals";
import type { SectionProps } from "./shared";

/** Counts and recent work in a handful of small queries rather than loading every record. */
function overviewStats(vehicleId: number) {
  const db = getDb();
  const count = (table: string) => (db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE vehicle_id = ?`).get(vehicleId) as { count: number }).count;
  const latestMot = db.prepare("SELECT MAX(expiry_date) as expiryDate FROM mot_records WHERE vehicle_id = ?").get(vehicleId) as { expiryDate: string | null };
  const openReminders = (db.prepare("SELECT COUNT(*) as count FROM reminders WHERE vehicle_id = ? AND completed_at IS NULL").get(vehicleId) as { count: number }).count;
  const recent = db.prepare(`
    SELECT 'm' || id as key, description as label, date FROM maintenance_records WHERE vehicle_id = @vehicleId
    UNION ALL
    SELECT 'r' || id, fault, date FROM repair_records WHERE vehicle_id = @vehicleId
    ORDER BY date DESC
    LIMIT 5
  `).all({ vehicleId }) as Array<{ key: string; label: string; date: string }>;
  return {
    maintenanceCount: count("maintenance_records"),
    repairCount: count("repair_records"),
    latestMotExpiry: latestMot.expiryDate,
    openReminders,
    recent
  };
}

export function OverviewSection({ vehicle, settings, motLabel }: SectionProps) {
  const stats = overviewStats(vehicle.id);
  const planned = getVehicleActivePlannedPurchaseSummary(vehicle.id);
  const averageEconomy = settings.fuelDisabled ? null : computeAverageFuelEconomy(listFuelRecords(vehicle.id), settings);
  const rate = estimateMileageRate(listOdometerReadings(vehicle.id));
  const nextRenewal = listRenewals(vehicle.id)
    .filter((renewal, index, all) => all.findIndex((r) => r.type === renewal.type) === index)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))[0];

  return (
    <section className="split-grid">
      <div className="list-panel">
        <h2>Snapshot</h2>
        <div className="metric-list">
          {settings.motFeature !== "disabled" ? (
            <>
              <span>Latest {motLabel}</span>
              <strong>{stats.latestMotExpiry ? formatDate(stats.latestMotExpiry, settings) : `No ${motLabel.toLowerCase()} logged`}</strong>
            </>
          ) : null}
          {nextRenewal ? (
            <>
              <span>Next renewal</span>
              <strong>{renewalTypeLabels[nextRenewal.type]} · {formatDate(nextRenewal.endDate, settings)}</strong>
            </>
          ) : null}
          <span>Maintenance entries</span>
          <strong>{stats.maintenanceCount}</strong>
          <span>Repair entries</span>
          <strong>{stats.repairCount}</strong>
          <span>Open reminders</span>
          <strong>{stats.openReminders}</strong>
          <span>To Buy</span>
          <strong>{planned.count}</strong>
          <span>Upcoming estimate</span>
          <strong>{formatCurrency(planned.estimatedTotal, settings)}</strong>
          {rate ? (
            <>
              <span>Typical distance</span>
              <strong>{formatMiles(annualDistance(rate), settings)} / year</strong>
              <span>Estimated today</span>
              <strong>{formatMiles(estimateOdometerOn(rate), settings)}</strong>
            </>
          ) : null}
          {averageEconomy ? (
            <>
              <span>Avg. economy</span>
              <strong>{averageEconomy}</strong>
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
        {stats.recent.length ? stats.recent.map((record) => (
          <div className="list-row" key={record.key}>
            <span>{record.label}</span>
            <strong>{formatDate(record.date, settings)}</strong>
          </div>
        )) : <p className="muted">No work logged yet.</p>}
      </div>
    </section>
  );
}
