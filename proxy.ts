import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";

/**
 * Adds a per-request nonce-based Content-Security-Policy to every page. Next.js reads the nonce
 * from the request's CSP header and puts it on its own scripts; the root layout passes it to the
 * theme <Script>. Authentication is NOT done here: every page and server action checks it itself.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy(nonce, { development: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API/route handlers that return files or JSON (they set their own headers),
      // Next's static assets, or files from public/ (anything with an extension).
      source: "/((?!api/|_next/static|_next/image|uploads/|calendar/|settings/backup|settings/export|.*\\.[a-zA-Z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};
