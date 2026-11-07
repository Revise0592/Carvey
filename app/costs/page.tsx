import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth";
import { listSpendEntries, type SpendType } from "@/lib/db";
import { formatCurrency, formatDate, todayIso } from "@/lib/format";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const typeTab: Record<SpendType, string> = {
  maintenance: "maintenance",
  repair: "repairs",
  mot: "mots",
  fuel: "fuel",
  parts: "to-buy"
};

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireUser();
  const query = await searchParams;
  const settings = getRegionalSettings();
  const motLabel = getMotLabel(settings);
  const typeLabel: Record<SpendType, string> = {
    maintenance: "Maintenance",
    repair: "Repairs",
    mot: motLabel,
    fuel: "Fuel",
    parts: "Parts & supplies"
  };

  const all = listSpendEntries();
  const currentYear = todayIso().slice(0, 4);
  const years = [...new Set([currentYear, ...all.map((entry) => entry.date.slice(0, 4))])].sort().reverse();
  const period = query.year === "all" ? "all" : years.includes(query.year ?? "") ? query.year! : currentYear;
  const entries = period === "all" ? all : all.filter((entry) => entry.date.startsWith(period));
  const total = entries.reduce((sum, entry) => sum + entry.cost, 0);

  const byType = (Object.keys(typeLabel) as SpendType[])
    .map((type) => ({ type, label: typeLabel[type], total: entries.filter((e) => e.type === type).reduce((s, e) => s + e.cost, 0) }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const vehicleTotals = new Map<number, { name: string; total: number }>();
  for (const entry of entries) {
    const row = vehicleTotals.get(entry.vehicleId) ?? { name: entry.vehicleName, total: 0 };
    row.total += entry.cost;
    vehicleTotals.set(entry.vehicleId, row);
  }
  const byVehicle = [...vehicleTotals.entries()].map(([id, row]) => ({ id, ...row })).sort((a, b) => b.total - a.total);

  const monthly = period === "all" ? null : MONTHS.map((label, index) => {
    const key = `${period}-${String(index + 1).padStart(2, "0")}`;
    return { label, total: entries.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + e.cost, 0) };
  });
  const monthlyMax = monthly ? Math.max(...monthly.map((m) => m.total), 0) : 0;
  const activeMonths = monthly?.filter((m) => m.total > 0).length ?? 0;

  return (
    <AppFrame>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Running costs</p>
          <h1>Costs</h1>
        </div>
      </section>

      <nav className="segmented-scroller" aria-label="Period">
        {years.map((year) => (
          <Link key={year} href={`/costs?year=${year}`} className={period === year ? "active" : ""} scroll={false}>{year}</Link>
        ))}
        <Link href="/costs?year=all" className={period === "all" ? "active" : ""} scroll={false}>All time</Link>
      </nav>

      <section className="cost-hero">
        <span>{period === "all" ? "Total logged" : `Spent in ${period}`}</span>
        <strong>{formatCurrency(total, settings)}</strong>
        <small>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
          {monthly && activeMonths ? ` · avg ${formatCurrency(total / Math.max(1, period === currentYear ? Number(todayIso().slice(5, 7)) : 12), settings)} / month` : ""}
        </small>
      </section>

      {entries.length ? (
        <>
          {monthly ? (
            <section className="grouped-section">
              <h2 className="group-label">By month</h2>
              <div className="inset-panel">
                <div className="month-chart" role="img" aria-label={`Monthly spend for ${period}`}>
                  {monthly.map((month) => (
                    <div className="month-col" key={month.label} tabIndex={0} aria-label={`${month.label}: ${formatCurrency(month.total, settings)}`}>
                      <span className="month-tip">{month.label} · {formatCurrency(month.total, settings)}</span>
                      <span className="month-bar-track">
                        <span className="month-bar" style={{ height: monthlyMax ? `${(month.total / monthlyMax) * 100}%` : "0%" }} />
                      </span>
                      <span className="month-label">{month.label.slice(0, 1)}<span className="month-label-rest">{month.label.slice(1)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="cost-columns">
            <section className="grouped-section">
              <h2 className="group-label">By type</h2>
              <div className="inset-panel bar-list">
                {byType.map((row) => (
                  <BarRow key={row.type} label={row.label} value={formatCurrency(row.total, settings)} share={row.total / total} />
                ))}
              </div>
            </section>

            <section className="grouped-section">
              <h2 className="group-label">By vehicle</h2>
              <div className="inset-panel bar-list">
                {byVehicle.map((row) => (
                  <BarRow key={row.id} label={row.name} value={formatCurrency(row.total, settings)} share={row.total / total} href={`/vehicles/${row.id}`} />
                ))}
              </div>
            </section>
          </div>

          <section className="grouped-section">
            <h2 className="group-label"><Receipt size={15} /> Recent spending</h2>
            <div className="inset-list">
              {entries.slice(0, 25).map((entry) => (
                <Link key={`${entry.type}-${entry.id}`} href={`/vehicles/${entry.vehicleId}?tab=${typeTab[entry.type]}`} className="inset-row">
                  <span className="inset-row-text">
                    <strong>{entry.label}</strong>
                    <small>{entry.vehicleName} · {typeLabel[entry.type]} · {formatDate(entry.date, settings)}</small>
                  </span>
                  <span className="inset-row-value">{formatCurrency(entry.cost, settings)}</span>
                  <ChevronRight size={18} className="inset-row-chevron" />
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="inset-empty">Nothing logged {period === "all" ? "yet" : `in ${period}`}. Costs from maintenance, repairs, tests, fuel and parts appear here.</p>
      )}
    </AppFrame>
  );
}

function BarRow({ label, value, share, href }: { label: string; value: string; share: number; href?: string }) {
  const body = (
    <>
      <span className="bar-row-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <span className="bar-track" title={`${label}: ${value} (${Math.round(share * 100)}%)`}>
        <span className="bar-fill" style={{ width: `${Math.max(share * 100, 1.5)}%` }} />
      </span>
    </>
  );
  return href ? <Link href={href} className="bar-row">{body}</Link> : <div className="bar-row">{body}</div>;
}
