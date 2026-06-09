import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, formatMiles, formatMotResult } from "@/lib/format";
import { getRegionalSettings } from "@/lib/regional-settings";
import { getSellerSheetData } from "@/lib/seller-sheet";

export default async function VehiclePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const vehicleId = Number.parseInt(id, 10);
  const report = getSellerSheetData(vehicleId);
  if (!report) notFound();

  const { vehicle, maintenance, repairs, mots, reminders, totals } = report;
  const settings = getRegionalSettings();
  const motLabel = settings.motFeature === "emissionsTest" ? "Emissions Test" : "MOT";
  const regMode = (settings.registrationLabel === "plateNumber" ? "plain" : "uk") as "plain" | "uk";
  const generatedAt = settings.dateFormat === "iso"
    ? new Date().toISOString().slice(0, 10)
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());

  return (
    <main className="print-sheet">
      <header className="print-toolbar print-hide">
        <Link className="secondary-button" href={`/vehicles/${vehicle.id}`} replace>
          Back to vehicle
        </Link>
        <PrintButton />
      </header>

      <section className="print-cover">
        <p className="print-eyebrow">Vehicle Info Sheet</p>
        <div className="print-title-row">
          <div>
            <h1>{vehicle.make} {vehicle.model}</h1>
            <p>{vehicle.year ?? "Year unknown"} · {vehicle.registration}</p>
          </div>
          <RegistrationPlate value={vehicle.registration} mode={regMode} />
        </div>
        <dl className="print-facts">
          <div><dt>{settings.distanceUnit === "km" ? "Current distance" : "Current mileage"}</dt><dd>{formatMiles(vehicle.effectiveOdometer, settings)}</dd></div>
          <div><dt>VIN</dt><dd>{vehicle.vin ?? "Not recorded"}</dd></div>
          <div><dt>Generated</dt><dd>{generatedAt}</dd></div>
          <div><dt>Total logged spend</dt><dd>{formatCurrency(totals.loggedSpend, settings)}</dd></div>
        </dl>
        {vehicle.notes ? (
          <div className="print-notes">
            <h2>Owner notes</h2>
            <p>{vehicle.notes}</p>
          </div>
        ) : null}
      </section>

      <section className="print-section">
        <h2>Summary</h2>
        <dl className="print-summary">
          <div><dt>Maintenance entries</dt><dd>{totals.maintenanceCount}</dd></div>
          <div><dt>Repair entries</dt><dd>{totals.repairCount}</dd></div>
          {settings.motFeature !== "disabled" ? <div><dt>{motLabel} records</dt><dd>{totals.motCount}</dd></div> : null}
          <div><dt>Open reminders</dt><dd>{totals.openReminderCount}</dd></div>
        </dl>
      </section>

      <PrintTable title="Maintenance history" empty="No maintenance has been logged.">
        {maintenance.map((record) => (
          <tr key={record.id}>
            <td>{formatDate(record.date, settings)}</td>
            <td>{formatMiles(record.odometer, settings)}</td>
            <td>{record.category}</td>
            <td>{record.description}{record.notes ? <p>{record.notes}</p> : null}</td>
            <td>{formatCurrency(record.cost, settings)}</td>
          </tr>
        ))}
      </PrintTable>

      <PrintTable title="Repair history" empty="No repairs have been logged.">
        {repairs.map((record) => (
          <tr key={record.id}>
            <td>{formatDate(record.date, settings)}</td>
            <td>{formatMiles(record.odometer, settings)}</td>
            <td>{record.garage ?? "Not recorded"}</td>
            <td>{record.fault}{record.notes ? <p>{record.notes}</p> : null}</td>
            <td>{formatCurrency(record.cost, settings)}</td>
          </tr>
        ))}
      </PrintTable>

      {settings.motFeature !== "disabled" ? (
        <section className="print-section">
          <h2>{motLabel} history</h2>
          {mots.length ? (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Tested</th>
                  <th>Expires</th>
                  <th>Mileage</th>
                  <th>Result</th>
                  <th>Reference</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {mots.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.testDate, settings)}</td>
                    <td>{formatDate(record.expiryDate, settings)}</td>
                    <td>{formatMiles(record.odometer, settings)}</td>
                    <td>{formatMotResult(record.result)}</td>
                    <td>{record.certificateRef ?? "Not recorded"}{record.advisories ? <p>{record.advisories}</p> : null}</td>
                    <td>{formatCurrency(record.cost, settings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="print-empty">No {motLabel.toLowerCase()}s have been logged.</p>}
        </section>
      ) : null}

      <section className="print-section">
        <h2>Open reminders</h2>
        {reminders.length ? (
          <table className="print-table">
            <thead>
              <tr>
                <th>Reminder</th>
                <th>Due date</th>
                <th>Recurrence</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((record) => (
                <tr key={record.id}>
                  <td>{record.title}</td>
                  <td>{formatDate(record.dueDate, settings)}</td>
                  <td>{record.recurrence ?? "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="print-empty">No open reminders.</p>}
      </section>
    </main>
  );
}

function PrintTable({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasRows = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);

  return (
    <section className="print-section">
      <h2>{title}</h2>
      {hasRows ? (
        <table className="print-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mileage</th>
              <th>Category/vendor</th>
              <th>Details</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      ) : <p className="print-empty">{empty}</p>}
    </section>
  );
}
