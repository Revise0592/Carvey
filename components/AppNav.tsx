"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CarFront,
  ChevronRight,
  FileBadge,
  Fuel,
  Hammer,
  Images,
  PackagePlus,
  Plus,
  Settings,
  ShieldCheck,
  Wallet,
  Warehouse,
  Wrench
} from "lucide-react";
import { Sheet } from "./Sheet";

export type QuickAddVehicle = {
  id: number;
  name: string;
  registration: string;
  thumbnailPath: string | null;
  sold: boolean;
};

export type QuickAddConfig = {
  vehicles: QuickAddVehicle[];
  motLabel: string | null;
  fuelEnabled: boolean;
};

const navItems = [
  { href: "/garage", label: "Garage", icon: Warehouse, match: (p: string) => p.startsWith("/garage") || p.startsWith("/vehicles") },
  { href: "/reminders", label: "Reminders", icon: BellRing, match: (p: string) => p.startsWith("/reminders") },
  { href: "/costs", label: "Costs", icon: Wallet, match: (p: string) => p.startsWith("/costs") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") }
] as const;

function useQuickAdd() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return { open, setOpen, close };
}

export function DesktopNav({ quickAdd }: { quickAdd: QuickAddConfig }) {
  const pathname = usePathname();
  const sheet = useQuickAdd();
  return (
    <>
      <nav className="desktop-nav" aria-label="Main">
        {navItems.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} className={match(pathname) ? "active" : ""} aria-current={match(pathname) ? "page" : undefined}>
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      <button type="button" className="primary-button desktop-add" onClick={() => sheet.setOpen(true)}>
        <Plus size={17} /> Add
      </button>
      <QuickAddSheet config={quickAdd} open={sheet.open} onClose={sheet.close} pathname={pathname} />
    </>
  );
}

export function BottomNav({ quickAdd }: { quickAdd: QuickAddConfig }) {
  const pathname = usePathname();
  const sheet = useQuickAdd();
  const [first, second, ...rest] = navItems;
  const renderItem = ({ href, label, icon: Icon, match }: (typeof navItems)[number]) => (
    <Link key={href} href={href} className={match(pathname) ? "active" : ""} aria-current={match(pathname) ? "page" : undefined}>
      <Icon size={22} strokeWidth={match(pathname) ? 2.3 : 1.9} />
      <span>{label}</span>
    </Link>
  );
  return (
    <>
      <nav className="bottom-nav" aria-label="Main">
        {renderItem(first)}
        {renderItem(second)}
        <button type="button" className="bottom-nav-add" aria-label="Quick add" onClick={() => sheet.setOpen(true)}>
          <span className="bottom-nav-add-circle"><Plus size={26} strokeWidth={2.4} /></span>
        </button>
        {rest.map(renderItem)}
      </nav>
      <QuickAddSheet config={quickAdd} open={sheet.open} onClose={sheet.close} pathname={pathname} />
    </>
  );
}

function QuickAddSheet({ config, open, onClose, pathname }: { config: QuickAddConfig; open: boolean; onClose: () => void; pathname: string }) {
  const router = useRouter();
  const contextVehicleId = Number(pathname.match(/^\/vehicles\/(\d+)/)?.[1]) || null;
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [choosing, setChoosing] = useState(false);

  const activeId = choosing ? null : pickedId ?? (config.vehicles.length === 1 ? config.vehicles[0].id : contextVehicleId);
  const vehicle = config.vehicles.find((v) => v.id === activeId) ?? null;

  const handleClose = useCallback(() => {
    onClose();
    setPickedId(null);
    setChoosing(false);
  }, [onClose]);

  function go(href: string) {
    handleClose();
    router.push(href, { scroll: false });
  }

  const actions = [
    { tab: "maintenance", label: "Maintenance", icon: Wrench },
    { tab: "repairs", label: "Repair", icon: Hammer },
    config.motLabel ? { tab: "mots", label: config.motLabel, icon: ShieldCheck } : null,
    config.fuelEnabled ? { tab: "fuel", label: "Fuel", icon: Fuel } : null,
    { tab: "reminders", label: "Reminder", icon: CalendarDays },
    { tab: "renewals", label: "Renewal", icon: FileBadge },
    { tab: "to-buy", label: "To Buy", icon: PackagePlus },
    { tab: "gallery", label: "Photo", icon: Images }
  ].filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <Sheet open={open} onClose={handleClose} title={vehicle ? `Log for ${vehicle.name}` : "Quick add"} className="quick-add-sheet">
      {vehicle ? (
        <div className="quick-add">
          <div className="quick-add-grid">
            {actions.map(({ tab, label, icon: Icon }) => (
              <button type="button" key={tab} className="quick-add-tile" onClick={() => go(`/vehicles/${vehicle.id}?tab=${tab}&new=${Date.now()}`)}>
                <span className="quick-add-icon"><Icon size={20} /></span>
                {label}
              </button>
            ))}
          </div>
          {config.vehicles.length > 1 ? (
            <button type="button" className="secondary-button quick-add-switch" onClick={() => setChoosing(true)}>
              <CarFront size={17} /> Choose a different vehicle
            </button>
          ) : null}
        </div>
      ) : (
        <div className="quick-add">
          <button type="button" className="quick-add-row quick-add-row-primary" onClick={() => go(`/garage?new=${Date.now()}`)}>
            <span className="quick-add-icon"><Plus size={20} /></span>
            <span className="quick-add-row-text"><strong>Add vehicle</strong><small>Start a new service history</small></span>
            <ChevronRight size={18} />
          </button>
          {config.vehicles.length ? (
            <>
              <p className="group-label">Log something for…</p>
              <div className="inset-list">
                {config.vehicles.map((v) => (
                  <button type="button" key={v.id} className="quick-add-row" onClick={() => { setPickedId(v.id); setChoosing(false); }}>
                    <span className="quick-add-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Local resized uploads, same as VehiclePhoto. */}
                      {v.thumbnailPath ? <img src={v.thumbnailPath} alt="" /> : <CarFront size={18} />}
                    </span>
                    <span className="quick-add-row-text">
                      <strong>{v.name}</strong>
                      <small>{v.registration.toUpperCase()}{v.sold ? " · Sold" : ""}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
