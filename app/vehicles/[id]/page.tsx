import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronLeft, Printer } from "lucide-react";
import { AppFrame } from "@/components/AppFrame";
import { DebugVehicleForm, EditVehicleForm, MileagePill } from "@/components/Forms";
import { ExplosionEffect } from "@/components/ExplosionEffect";
import { RegistrationPlate } from "@/components/RegistrationPlate";
import { VehicleTabs } from "@/components/VehicleTabs";
import { VehiclePhotoUploadForm } from "@/components/VehiclePhotoUploadForm";
import { VehiclePhoto } from "@/components/VehiclePhoto";
import { getCollectionName, getVehicle, getVehicleLoggedSpend } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { debugEasterEggsEnabled } from "@/lib/debug";
import { formatCurrency, formatMiles } from "@/lib/format";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";
import { GallerySection } from "./_sections/gallery";
import { OverviewSection } from "./_sections/overview";
import { RemindersSection, ServicePlanSection, ToBuySection } from "./_sections/planning";
import { FuelSection, MaintenanceSection, MotsSection, RepairsSection } from "./_sections/records";
import { RenewalsSection } from "./_sections/renewals";
import type { SectionProps, VehicleQuery } from "./_sections/shared";

const sections = {
  overview: { label: "Overview", Section: OverviewSection },
  maintenance: { label: "Maintenance", Section: MaintenanceSection },
  repairs: { label: "Repairs", Section: RepairsSection },
  mots: { label: "MOTs", Section: MotsSection },
  renewals: { label: "Renewals", Section: RenewalsSection },
  "to-buy": { label: "To Buy", Section: ToBuySection },
  reminders: { label: "Reminders", Section: RemindersSection },
  "service-plan": { label: "Service Plan", Section: ServicePlanSection },
  fuel: { label: "Fuel", Section: FuelSection },
  gallery: { label: "Gallery", Section: GallerySection }
} satisfies Record<string, { label: string; Section: (props: SectionProps) => React.ReactNode }>;

type Tab = keyof typeof sections;

export default async function VehiclePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<VehicleQuery>;
}) {
  await requireUser();
  const { id } = await params;
  const vehicle = getVehicle(Number.parseInt(id, 10));
  if (!vehicle) notFound();

  const query = await searchParams;
  const settings = getRegionalSettings();
  const motLabel = getMotLabel(settings);
  const tabs = (Object.keys(sections) as Tab[])
    .filter((tab) => tab !== "mots" || settings.motFeature !== "disabled")
    .filter((tab) => tab !== "fuel" || !settings.fuelDisabled);
  const activeTab: Tab = tabs.includes(query.tab as Tab) ? (query.tab as Tab) : "overview";
  const { Section } = sections[activeTab];
  const spent = getVehicleLoggedSpend(vehicle.id);
  const debugEnabled = debugEasterEggsEnabled();

  return (
    <AppFrame title={`${vehicle.make} ${vehicle.model}`} backHref="/garage" backLabel="Garage">
      {debugEnabled ? <ExplosionEffect active={Boolean(vehicle.debugDestroyed)} /> : null}
      <section className="vehicle-hero">
        <div className="photo-frame hero-photo-frame">
          <VehiclePhoto src={vehicle.photoPath} alt={`${vehicle.make} ${vehicle.model}`} className="hero-photo" />
          {vehicle.sold ? (
            <span className="photo-sold-badge">
              <BadgeCheck size={14} />
              Sold
            </span>
          ) : null}
        </div>
        <div className="vehicle-hero-copy">
          <Link href="/garage" className="back-link"><ChevronLeft size={16} /> {getCollectionName()}</Link>
          <RegistrationPlate value={vehicle.registration} mode={settings.plateStyle} />
          <h1>{vehicle.make} {vehicle.model}</h1>
          <div className="hero-meta">
            <MileagePill>{formatMiles(vehicle.effectiveOdometer, settings)}</MileagePill>
            <span className="pill">{vehicle.year ?? "Year unknown"}</span>
            <span className="pill">{formatCurrency(spent, settings)} logged</span>
            {vehicle.purchasePrice ? <span className="pill">{formatCurrency(vehicle.purchasePrice, settings)} paid</span> : null}
          </div>
          {vehicle.notes ? <p className="vehicle-notes">{vehicle.notes}</p> : null}
          <div className="hero-actions">
            <VehiclePhotoUploadForm vehicleId={vehicle.id} />
            <Link className="secondary-button" href={`/vehicles/${vehicle.id}/print`}>
              <Printer size={17} />
              Print
            </Link>
            <EditVehicleForm vehicle={vehicle} registrationLabel="Registration" />
            {debugEnabled ? <DebugVehicleForm vehicle={vehicle} /> : null}
          </div>
        </div>
      </section>

      <VehicleTabs
        label="Vehicle sections"
        activeTab={activeTab}
        tabs={tabs.map((tab) => ({
          key: tab,
          href: `/vehicles/${vehicle.id}?tab=${tab}`,
          label: tab === "mots" ? `${motLabel}s` : sections[tab].label
        }))}
      />

      <Section vehicle={vehicle} settings={settings} motLabel={motLabel} query={query} />
    </AppFrame>
  );
}
