import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BottomNav, DesktopNav, type QuickAddConfig } from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { listVehicles } from "@/lib/db";
import { canSignOut, currentUser } from "@/lib/auth";
import { getMotLabel, getRegionalSettings } from "@/lib/regional-settings";

/**
 * Page chrome. Desktop gets a sticky top bar with inline navigation; mobile gets a compact
 * app bar (logo, or back + title on sub-pages) and a fixed bottom tab bar with quick-add.
 */
export async function AppFrame({
  children,
  title,
  backHref,
  backLabel = "Back"
}: {
  children: React.ReactNode;
  /** Title for the mobile app bar on sub-pages (only shown alongside backHref). */
  title?: string;
  /** When set, the mobile app bar shows a back chevron linking here instead of the logo. */
  backHref?: string;
  backLabel?: string;
}) {
  const user = await currentUser();
  const showSignOut = user ? canSignOut(user) : false;
  const settings = getRegionalSettings();
  const quickAdd: QuickAddConfig = {
    vehicles: listVehicles()
      .map((vehicle) => ({
        id: vehicle.id,
        name: `${vehicle.make} ${vehicle.model}`.trim(),
        registration: vehicle.registration,
        thumbnailPath: vehicle.thumbnailPath,
        sold: Boolean(vehicle.sold)
      }))
      .sort((a, b) => Number(a.sold) - Number(b.sold)),
    motLabel: settings.motFeature === "disabled" ? null : getMotLabel(settings),
    fuelEnabled: !settings.fuelDisabled
  };

  return (
    <div className={`app-shell${backHref ? " has-back" : ""}`}>
      <header className="topbar">
        <div className="topbar-inner">
          {backHref ? (
            <Link href={backHref} className="topbar-back">
              <ChevronLeft size={24} strokeWidth={2.25} />
              <span>{backLabel}</span>
            </Link>
          ) : null}
          <Link href="/garage" className="brand" aria-label="Carvey garage">
            <BrandLogo />
          </Link>
          {backHref && title ? <span className="topbar-title">{title}</span> : null}
          <DesktopNav quickAdd={quickAdd} />
          {showSignOut ? (
            <form action={logoutAction} className="topbar-logout">
              <button type="submit" className="icon-button" aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          ) : <span className="topbar-spacer" aria-hidden="true" />}
        </div>
      </header>
      <main className="page-content">{children}</main>
      <BottomNav quickAdd={quickAdd} />
    </div>
  );
}
