/**
 * Cross-site request checks for route handlers. Server actions already get Next.js's origin
 * check; plain POST route handlers don't, and SameSite=Lax cookies are still sent from sibling
 * subdomains (same *site*), which is common on self-hosted setups. So every state-changing route
 * handler calls `rejectCrossOrigin` first.
 */

type HeaderSource = { get(name: string): string | null };

function firstValue(value: string | null) {
  return value?.split(",")[0]?.trim().toLowerCase() || null;
}

export function allowedHosts(headers: HeaderSource) {
  const hosts = new Set<string>();
  const host = firstValue(headers.get("host"));
  const forwarded = firstValue(headers.get("x-forwarded-host"));
  if (host) hosts.add(host);
  if (forwarded) hosts.add(forwarded);
  for (const extra of (process.env.CARVEY_ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = extra.trim().toLowerCase();
    if (!trimmed) continue;
    try {
      hosts.add(new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host);
    } catch {
      // Ignore malformed entries.
    }
  }
  return hosts;
}

/** True when the request demonstrably comes from a page on this app. */
export function isSameOriginRequest(headers: HeaderSource) {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;

  const origin = headers.get("origin") ?? headers.get("referer");
  if (!origin || origin === "null") return fetchSite === "same-origin";
  try {
    return allowedHosts(headers).has(new URL(origin).host.toLowerCase());
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request): Response | null {
  if (isSameOriginRequest(request.headers)) return null;
  return new Response("Cross-site request blocked", { status: 403 });
}

/** Best-effort client label for the sessions list. Never used for security decisions. */
export function describeUserAgent(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Mac OS X/.test(userAgent) ? "macOS" : /Windows/.test(userAgent) ? "Windows" : /Linux/.test(userAgent) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}
