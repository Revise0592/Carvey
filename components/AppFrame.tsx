import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BrandLogo, BrandWordmark } from "@/components/BrandLogo";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/garage" className="brand">
          <span className="brand-mark small"><BrandLogo /></span>
          <BrandWordmark />
        </Link>
        <nav className="top-actions">
          <Link href="/settings" className="icon-button" aria-label="Settings" title="Settings">
            <Settings size={18} />
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="icon-button" aria-label="Sign out" title="Sign out">
              <LogOut size={18} />
            </button>
          </form>
        </nav>
      </header>
      {children}
    </main>
  );
}
