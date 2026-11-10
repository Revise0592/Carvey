import { FileDown, FileUp, ListChecks } from "lucide-react";
import { csvFields, csvKindLabels, CSV_KINDS } from "@/lib/csv-records";
import { readImportPreview } from "@/lib/data-transfer";
import { listVehicles } from "@/lib/db";
import type { RegionalSettings } from "@/lib/regional-settings";

type DataParams = { import?: string; token?: string; message?: string; count?: string; skipped?: string; label?: string };

export async function DataPanel({ params, settings }: { params: DataParams; settings: RegionalSettings }) {
  const vehicles = listVehicles();
  const preview = params.import === "preview" ? await readImportPreview(params.token) : null;
  const volumeUnit = settings.fuelVolumeUnit === "gallons" ? "gallons" : "litres";
  const distanceUnit = settings.distanceUnit === "km" ? "km" : "miles";

  return (
    <section className="settings-grid">
      <article className="settings-panel">
        <h2><FileDown size={19} /> Export CSV</h2>
        <p className="muted">Open your history in a spreadsheet. Use Backup &amp; Restore for a full copy of Carvey including photos.</p>
        <form action="/settings/export" method="get" className="record-form">
          <label>
            What to export
            <select name="kind" defaultValue="all">
              <option value="all">Everything (zip of CSV files)</option>
              {CSV_KINDS.map((kind) => <option key={kind} value={kind}>{csvKindLabels[kind]}</option>)}
            </select>
          </label>
          <label>
            Vehicle
            <select name="vehicle" defaultValue="all">
              <option value="all">All vehicles</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration}</option>)}
            </select>
            <small className="field-hint">The zip always includes every vehicle.</small>
          </label>
          <button className="primary-button" type="submit">Download</button>
        </form>
      </article>

      <article className="settings-panel">
        <h2><FileUp size={19} /> Import CSV</h2>
        <p className="muted">
          Bring in history from a spreadsheet or another app. You&apos;ll see a preview before anything is saved, and rows that match existing records are skipped.
        </p>
        {params.import === "error" ? <p className="error">{params.message ?? "Import failed."}</p> : null}
        {params.import === "cancelled" ? <p className="success">Import cancelled. Nothing was changed.</p> : null}
        {params.import === "done" ? (
          <p className="success">
            Imported {params.count} {params.label?.toLowerCase()} {params.count === "1" ? "record" : "records"}
            {params.skipped && params.skipped !== "0" ? `, skipped ${params.skipped} duplicate${params.skipped === "1" ? "" : "s"}` : ""}.
          </p>
        ) : null}
        {vehicles.length ? (
          <form action="/settings/import/preview" method="post" encType="multipart/form-data" className="record-form">
            <label>
              File contains
              <select name="kind" defaultValue="maintenance" required>
                {CSV_KINDS.map((kind) => <option key={kind} value={kind}>{csvKindLabels[kind]}</option>)}
              </select>
            </label>
            <label>
              Import into
              <select name="vehicle" defaultValue={vehicles.length === 1 ? String(vehicles[0].id) : "registration"} required>
                <option value="registration">Match each row by its registration column</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration}</option>)}
              </select>
            </label>
            <label>
              Dates like 03/04/2025 mean
              <select name="dateOrder" defaultValue={settings.currency === "USD" ? "mdy" : "dmy"}>
                <option value="dmy">3 April (day first)</option>
                <option value="mdy">March 4 (month first)</option>
              </select>
            </label>
            <label>
              CSV file
              <input name="file" type="file" accept=".csv,text/csv,text/plain" required />
            </label>
            <button className="secondary-button" type="submit">Preview import</button>
          </form>
        ) : <p className="muted">Add a vehicle first, then import its history.</p>}
        <details className="field-hint">
          <summary>Expected columns</summary>
          <p>Headers are matched by name, and common alternatives work (for example <code>mileage</code> for odometer or <code>price</code> for cost). Required columns are marked *. Odometer is in {distanceUnit}; fuel volume is in {volumeUnit}.</p>
          <ul>
            {CSV_KINDS.map((kind) => (
              <li key={kind}><strong>{csvKindLabels[kind]}:</strong> {csvFields[kind].map((f) => `${f.header}${f.required ? "*" : ""}`).join(", ")}</li>
            ))}
          </ul>
        </details>
      </article>

      {preview ? (
        <article className="settings-panel restore-preview import-preview">
          <h2><ListChecks size={19} /> Import preview</h2>
          <p className="muted">{preview.fileName} · {csvKindLabels[preview.kind]}</p>
          <dl className="metric-list">
            <span>Ready to import</span>
            <strong>{preview.rows.filter((row) => !row.duplicate).length}</strong>
            <span>Already in Carvey</span>
            <strong>{preview.rows.filter((row) => row.duplicate).length}</strong>
            <span>Rows with problems</span>
            <strong>{preview.errors.length}</strong>
            <span>Vehicles</span>
            <strong>{Object.values(preview.vehicleNames).join(", ") || "—"}</strong>
          </dl>
          <p className="group-label">Columns used</p>
          <ul className="import-columns">
            {preview.columns.map((column) => (
              <li key={column.field}><code>{column.field}</code> ← {column.column ? <strong>{column.column}</strong> : <span className="muted">not found</span>}</li>
            ))}
          </ul>
          {preview.rows.length ? (
            <>
              <p className="group-label">First rows</p>
              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      {csvFields[preview.kind].map((field) => <th key={field.key}>{field.header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 8).map((row) => (
                      <tr key={row.line} className={row.duplicate ? "is-duplicate" : undefined}>
                        <td>{row.line}{row.duplicate ? " (dup)" : ""}</td>
                        {csvFields[preview.kind].map((field) => <td key={field.key}>{formatCell(row.values[field.key])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {preview.errors.length ? (
            <>
              <p className="group-label">Rows that will be skipped</p>
              <ul className="import-errors">
                {preview.errors.slice(0, 20).map((error) => <li key={`${error.line}-${error.message}`}>Line {error.line}: {error.message}</li>)}
                {preview.errors.length > 20 ? <li>…and {preview.errors.length - 20} more</li> : null}
              </ul>
            </>
          ) : null}
          <form action="/settings/import/confirm" method="post" className="record-form">
            <input type="hidden" name="token" value={preview.token} />
            {preview.rows.some((row) => row.duplicate) ? (
              <label className="checkbox-field">
                <input type="checkbox" name="includeDuplicates" />
                Import rows that look like duplicates too
              </label>
            ) : null}
            <div className="button-row">
              <button className="primary-button" type="submit" disabled={!preview.rows.length}>Import {preview.rows.filter((row) => !row.duplicate).length} rows</button>
              <button className="secondary-button" type="submit" name="cancel" value="1" formNoValidate>Cancel</button>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}

function formatCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}
