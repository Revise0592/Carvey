import Link from "next/link";
import { CarFront, LogOut, Settings, Wrench } from "lucide-react";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/garage" className="brand">
          <span className="brand-mark small"><CarFront size={19} /></span>
          <span>Carvey</span>
        </Link>
        <nav className="top-actions">
          <Link href="/garage" className="icon-button" aria-label="Garage" title="Garage">
            <Wrench size={18} />
          </Link>
          <Link href="/settings" className="icon-button" aria-label="Settings" title="Settings">
            <Settings size={18} />
          </Link>
          <Link href="/logout" className="icon-button" aria-label="Sign out" title="Sign out">
            <LogOut size={18} />
          </Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
