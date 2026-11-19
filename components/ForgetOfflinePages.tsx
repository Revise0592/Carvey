"use client";

import { useEffect } from "react";

/**
 * Rendered on the sign-in page. Signing out (or a session expiring) lands here, so delete the
 * pages the service worker saved for offline use: they must not stay readable on this device
 * without signing in again. Sign-out is a client-side navigation, which the service worker
 * itself never sees, hence doing it from the page.
 */
export function ForgetOfflinePages() {
  useEffect(() => {
    if (!("caches" in window)) return;
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("carvey-pages-")).map((key) => caches.delete(key))))
      .catch(() => {});
  }, []);
  return null;
}
