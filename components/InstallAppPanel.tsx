"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function InstallAppPanel() {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const w = window as Window & { __carveyPwaInstall?: () => Promise<void> };
    if (w.__carveyPwaInstall) setCanInstall(true);

    const onAvailable = () => setCanInstall(true);
    window.addEventListener("carvey-install-available", onAvailable);
    return () => window.removeEventListener("carvey-install-available", onAvailable);
  }, []);

  if (installed) {
    return (
      <article className="settings-panel">
        <h2><Download size={19} /> Install App</h2>
        <p className="muted">Carvey is installed on this device.</p>
      </article>
    );
  }

  if (!canInstall) return null;

  async function handleInstall() {
    const w = window as Window & { __carveyPwaInstall?: () => Promise<void> };
    if (!w.__carveyPwaInstall) return;
    await w.__carveyPwaInstall();
    setCanInstall(false);
  }

  return (
    <article className="settings-panel">
      <h2><Download size={19} /> Install App</h2>
      <p className="muted">Add Carvey to your home screen for a full-screen, app-like experience.</p>
      <button className="primary-button" type="button" onClick={handleInstall}>
        <Download size={15} /> Install App
      </button>
    </article>
  );
}
