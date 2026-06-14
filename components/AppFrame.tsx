import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BrandLogo } from "@/components/BrandLogo";
import { getAppSetting } from "@/lib/db";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const authDisabled = getAppSetting("authDisabled") === "true";
  return (
    <main className="app-shell">
      <header className="topbar">
        <Link href="/garage" className="brand">
          <BrandLogo />
        </Link>
        <nav className="top-actions">
          <Link href="/settings" className="icon-button" aria-label="Settings" title="Settings">
            <Settings size={18} />
          </Link>
          {!authDisabled ? (
            <form action={logoutAction}>
              <button type="submit" className="icon-button" aria-label="Sign out" title="Sign out">
                <LogOut size={18} />
              </button>
            </form>
          ) : null}
        </nav>
      </header>
      <div className="page-content">
        {children}
      </div>
    </main>
  );
}
