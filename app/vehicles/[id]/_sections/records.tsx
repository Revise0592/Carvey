import { Fuel, Hammer, ShieldCheck, Wrench } from "lucide-react";
import { deleteAttachmentAction } from "@/app/actions";
import { AttachmentSection } from "@/components/AttachmentSection";
import { EditFuelRecordForm, EditMaintenanceForm, EditMotForm, EditRepairForm, FuelRecordForm, MaintenanceForm, MotForm, RepairForm } from "@/components/Forms";
import { RecordItem } from "@/components/RecordItem";
import { groupAttachmentsByRecord, listFuelRecords, listMaintenance, listMaintenanceCategories, listMots, listRepairs, listWorkshops, type AttachmentRecordType } from "@/lib/db";
import { computeAverageFuelEconomy, computeFuelEconomies, formatCurrency, formatDate, formatMiles, formatMotResult, formatVolume } from "@/lib/format";
import { byNumber, byText, EmptyRecords, motResultTone, SortBar, sortBy, sortState, type SectionProps } from "./shared";

function attachmentRenderer(vehicleId: number, recordType: AttachmentRecordType) {
  const grouped = groupAttachmentsByRecord(vehicleId, recordType);
  const deleteAction = deleteAttachmentAction.bind(null, vehicleId);
  return function renderAttachments(recordId: number) {
    return <AttachmentSection attachments={grouped.get(recordId) ?? []} deleteAction={deleteAction} recordType={recordType} recordId={recordId} vehicleId={vehicleId} />;
  };
}

export function MaintenanceSection({ vehicle, settings, query }: SectionProps) {
  const records = listMaintenance(vehicle.id);
  const categories = listMaintenanceCategories();
  const workshops = listWorkshops();
  const attachments = attachmentRenderer(vehicle.id, "maintenance");
  const { sort, dir } = sortState(query, "date");
  const sorted = sortBy(records, sort, dir, {
    date: byText((r) => r.date),
    cost: byNumber((r) => r.cost),
    category: byText((r) => r.category)
  });
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><Wrench size={19} /> Maintenance</h2>
        <MaintenanceForm vehicleId={vehicle.id} categories={categories} workshops={workshops} autoOpenKey={query.new} />
      </div>
      {records.length ? (
        <>
          <SortBar vehicleId={vehicle.id} tab="maintenance" activeSort={sort} activeDir={dir} options={[
            { key: "date", label: "Date" },
            { key: "cost", label: "Cost" },
            { key: "category", label: "Category" }
          ]} />
          <div className="record-list">
            {sorted.map((record) => (
              <RecordItem
                key={record.id}
                tag={<span className="tag">{record.category}</span>}
                title={record.description}
                meta={`${formatDate(record.date, settings)} · ${formatMiles(record.odometer, settings)}${record.garage ? ` · ${record.garage}` : ""}`}
                value={formatCurrency(record.cost, settings)}
                actions={<EditMaintenanceForm record={record} categories={categories} workshops={workshops} />}
                attachments={attachments(record.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyRecords title="No maintenance logged">Add the first service or upkeep entry for this car, or import a history from CSV in Settings.</EmptyRecords>
      )}
    </section>
  );
}

export function RepairsSection({ vehicle, settings, query }: SectionProps) {
  const records = listRepairs(vehicle.id);
  const workshops = listWorkshops();
  const attachments = attachmentRenderer(vehicle.id, "repair");
  const { sort, dir } = sortState(query, "date");
  const sorted = sortBy(records, sort, dir, {
    date: byText((r) => r.date),
    cost: byNumber((r) => r.cost)
  });
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><Hammer size={19} /> Repairs</h2>
        <RepairForm vehicleId={vehicle.id} workshops={workshops} autoOpenKey={query.new} />
      </div>
      {records.length ? (
        <>
          <SortBar vehicleId={vehicle.id} tab="repairs" activeSort={sort} activeDir={dir} options={[
            { key: "date", label: "Date" },
            { key: "cost", label: "Cost" }
          ]} />
          <div className="record-list">
            {sorted.map((record) => (
              <RecordItem
                key={record.id}
                tag={<span className="tag">{record.garage ?? "Repair"}</span>}
                title={record.fault}
                meta={`${formatDate(record.date, settings)} · ${formatMiles(record.odometer, settings)}`}
                value={formatCurrency(record.cost, settings)}
                actions={<EditRepairForm record={record} workshops={workshops} />}
                attachments={attachments(record.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyRecords title="No repairs logged">Track faults, fixes, and garage work once they happen.</EmptyRecords>
      )}
    </section>
  );
}

export function MotsSection({ vehicle, settings, motLabel, query }: SectionProps) {
  const records = listMots(vehicle.id);
  const attachments = attachmentRenderer(vehicle.id, "mot");
  const { sort, dir } = sortState(query, "expiry");
  const sorted = sortBy(records, sort, dir, {
    expiry: byText((r) => r.expiryDate),
    testDate: byText((r) => r.testDate),
    cost: byNumber((r) => r.cost)
  });
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><ShieldCheck size={19} /> {motLabel}s</h2>
        <MotForm vehicleId={vehicle.id} motLabel={motLabel} autoOpenKey={query.new} />
      </div>
      {records.length ? (
        <>
          <SortBar vehicleId={vehicle.id} tab="mots" activeSort={sort} activeDir={dir} options={[
            { key: "expiry", label: "Expiry date" },
            { key: "testDate", label: "Test date" },
            { key: "cost", label: "Cost" }
          ]} />
          <div className="record-list">
            {sorted.map((record) => (
              <RecordItem
                key={record.id}
                tag={<span className={`tag ${motResultTone(record.result)}`}>{formatMotResult(record.result)}</span>}
                title={`Expires ${formatDate(record.expiryDate, settings)}`}
                meta={`Tested ${formatDate(record.testDate, settings)} · ${formatMiles(record.odometer, settings)}`}
                value={formatCurrency(record.cost, settings)}
                actions={<EditMotForm record={record} motLabel={motLabel} />}
                attachments={attachments(record.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyRecords title={`No ${motLabel.toLowerCase()} history yet`}>
          Add the latest {motLabel.toLowerCase()} result to start building this vehicle&apos;s test record.
        </EmptyRecords>
      )}
    </section>
  );
}

export function FuelSection({ vehicle, settings, query }: SectionProps) {
  const records = listFuelRecords(vehicle.id);
  const { sort, dir } = sortState(query, "date");
  const sorted = sortBy(records, sort, dir, {
    date: byText((r) => r.date),
    cost: byNumber((r) => r.totalCost),
    odometer: byNumber((r) => r.odometer)
  });
  const economies = computeFuelEconomies(records, settings);
  const averageEconomy = computeAverageFuelEconomy(records, settings);
  const totalFuelSpend = records.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
  return (
    <section className="records-shell">
      <div className="section-heading">
        <h2><Fuel size={19} /> Fuel</h2>
        <FuelRecordForm vehicleId={vehicle.id} settings={settings} autoOpenKey={query.new} />
      </div>
      {records.length ? (
        <>
          <div className="metric-list metric-panel">
            <span>Fill-ups logged</span>
            <strong>{records.length}</strong>
            <span>Total fuel spend</span>
            <strong>{formatCurrency(totalFuelSpend, settings)}</strong>
            <span>Avg. economy</span>
            <strong>{averageEconomy ?? "—"}</strong>
          </div>
          <SortBar vehicleId={vehicle.id} tab="fuel" activeSort={sort} activeDir={dir} options={[
            { key: "date", label: "Date" },
            { key: "cost", label: "Cost" },
            { key: "odometer", label: "Odometer" }
          ]} />
          <div className="record-list">
            {sorted.map((record) => {
              const economy = economies.get(record.id);
              return (
                <RecordItem
                  key={record.id}
                  tag={<span className="tag tag-neutral">{record.fuelType}</span>}
                  title={`${formatVolume(record.volumeLitres, settings)}${record.station ? ` · ${record.station}` : ""}`}
                  meta={`${formatDate(record.date, settings)} · ${formatMiles(record.odometer, settings)}${!record.fullTank ? " · Partial" : ""}${economy ? ` · ${economy}` : ""}`}
                  value={record.totalCost != null ? formatCurrency(record.totalCost, settings) : null}
                  actions={<EditFuelRecordForm record={record} settings={settings} />}
                />
              );
            })}
          </div>
        </>
      ) : (
        <EmptyRecords title="No fuel logged">Log fill-ups to track spend and fuel economy over time.</EmptyRecords>
      )}
    </section>
  );
}
