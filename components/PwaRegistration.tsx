"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration is a best-effort enhancement — fail silently
    });

    const handler = (event: Event) => {
      const promptEvent = event as Event & { prompt(): Promise<void> };
      // Expose the deferred prompt so InstallAppPanel can trigger it
      (window as Window & { __carveyPwaInstall?: () => Promise<void> }).__carveyPwaInstall = () =>
        promptEvent.prompt();
      window.dispatchEvent(new Event("carvey-install-available"));
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
