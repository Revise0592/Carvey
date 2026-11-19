"use client";

import { useEffect, useState } from "react";

export function PwaRegistration() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

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

  return offline ? (
    <div className="offline-banner" role="status">
      You&apos;re offline. This is the last saved copy; changes can&apos;t be saved until you&apos;re back online.
    </div>
  ) : null;
}
