import Link from "next/link";
import type { Vehicle } from "@/lib/db";
import type { MotResult, PlannedPurchaseStatus, ReminderStatusLabel } from "@/lib/format";
import type { RegionalSettings } from "@/lib/regional-settings";

export type VehicleQuery = { tab?: string; sort?: string; dir?: string; new?: string; show?: string };

export type SectionProps = {
  vehicle: Vehicle;
  settings: RegionalSettings;
  motLabel: string;
  query: VehicleQuery;
};

export type SortDir = "asc" | "desc";

export function sortState(query: VehicleQuery, fallback: string): { sort: string; dir: SortDir } {
  return { sort: query.sort || fallback, dir: query.dir === "asc" ? "asc" : "desc" };
}

/** Sorts a copy of `items` by the comparator registered for `sort`, falling back to the first. */
export function sortBy<T>(items: T[], sort: string, dir: SortDir, comparators: Record<string, (a: T, b: T) => number>) {
  const compare = comparators[sort] ?? Object.values(comparators)[0];
  const m = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => m * compare(a, b));
}

/** Rows rendered per record tab before "Show more". Keeps long histories light on phones. */
export const recordPageSize = 50;

export type RecordPage<T> = { items: T[]; shown: number; total: number };

/** The first `?show=` rows (default recordPageSize), after sorting, so every sort order pages the same way. */
export function paginate<T>(items: T[], query: VehicleQuery): RecordPage<T> {
  const requested = Number.parseInt(query.show ?? "", 10);
  const shown = Math.min(items.length, Number.isFinite(requested) && requested > recordPageSize ? requested : recordPageSize);
  return { items: items.slice(0, shown), shown, total: items.length };
}

export function ShowMore<T>({ vehicleId, tab, query, page }: { vehicleId: number; tab: string; query: VehicleQuery; page: RecordPage<T> }) {
  if (page.shown >= page.total) return null;
  const params = new URLSearchParams({ tab, show: String(page.shown + recordPageSize) });
  if (query.sort) params.set("sort", query.sort);
  if (query.dir) params.set("dir", query.dir);
  return (
    <div className="show-more">
      <span className="muted">Showing {page.shown} of {page.total}</span>
      <Link className="secondary-button" href={`/vehicles/${vehicleId}?${params}`} scroll={false}>Show {Math.min(recordPageSize, page.total - page.shown)} more</Link>
    </div>
  );
}

export const byText = <T,>(pick: (item: T) => string | null | undefined, missing = "9999") => (a: T, b: T) => (pick(a) ?? missing).localeCompare(pick(b) ?? missing);
export const byNumber = <T,>(pick: (item: T) => number | null | undefined) => (a: T, b: T) => (pick(a) ?? 0) - (pick(b) ?? 0);

export function SortBar({ vehicleId, tab, options, activeSort, activeDir }: {
  vehicleId: number;
  tab: string;
  options: { key: string; label: string }[];
  activeSort: string;
  activeDir: SortDir;
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

export function EmptyRecords({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="empty-state records-empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function motResultTone(result: MotResult) {
  const tones: Record<MotResult, string> = {
    pass: "tag-success",
    fail: "tag-danger",
    advisory: "tag-warning"
  };
  return tones[result];
}

export function reminderStatusTone(status: ReminderStatusLabel) {
  const tones: Record<ReminderStatusLabel, string> = {
    done: "tag-success",
    overdue: "tag-danger",
    upcoming: "tag-warning",
    open: "tag-neutral"
  };
  return tones[status];
}

export function plannedPurchaseStatus(convertedAt: string | null, convertedToType: "maintenance" | "repair" | null): PlannedPurchaseStatus {
  if (!convertedAt) return "purchased";
  return convertedToType === "repair" ? "logged-as-repair" : "logged-as-maintenance";
}

export function addYear(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${Number(year) + 1}-${month}-${month === "02" && day === "29" ? "28" : day}`;
}
