"use client";

import { useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";

type InstallWindow = Window & { __carveyPwaInstall?: () => Promise<void> };

function subscribeNoop() {
  return () => {};
}

function subscribeInstallAvailable(onChange: () => void) {
  window.addEventListener("carvey-install-available", onChange);
  return () => window.removeEventListener("carvey-install-available", onChange);
}

export function InstallAppPanel() {
  // Read browser state through external stores so SSR renders nothing and hydration stays in sync.
  const installed = useSyncExternalStore(subscribeNoop, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  const available = useSyncExternalStore(subscribeInstallAvailable, () => Boolean((window as InstallWindow).__carveyPwaInstall), () => false);
  const [dismissed, setDismissed] = useState(false);
  const canInstall = available && !dismissed;

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
    const w = window as InstallWindow;
    if (!w.__carveyPwaInstall) return;
    await w.__carveyPwaInstall();
    setDismissed(true);
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
