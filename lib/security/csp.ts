/**
 * The Content-Security-Policy for pages. Scripts only run if they carry this request's nonce
 * (Next.js adds it to its own scripts) or were loaded by one that did ('strict-dynamic'), so an
 * injected <script> or inline event handler can't run.
 *
 * Deliberate choices:
 * - style-src allows inline styles: React `style` props need it, and adding a nonce there would
 *   switch 'unsafe-inline' off. Injected CSS can't run code.
 * - No upgrade-insecure-requests: Carvey is often opened over plain HTTP on a LAN, where
 *   upgrading every asset request to HTTPS would break the page.
 * - worker-src 'self' so the PWA service worker still registers under 'strict-dynamic'.
 */
export function buildContentSecurityPolicy(nonce: string, options: { development?: boolean } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
}

export function createNonce() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
}
