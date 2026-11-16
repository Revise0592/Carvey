# Mobile companion app: options and recommendation

## 1. Where Carvey is today

Carvey already works on a phone, and that changes the maths:

- **It is already an installable PWA.** `public/manifest.json`, `public/sw.js`, an install panel in Settings, mobile tab navigation, bottom-sheet forms and safe-area-aware layouts (the October redesign).
- **There is no JSON API.** Pages are server-rendered React Server Components; every write is a Next.js server action (an opaque, build-specific endpoint posting form data). This is ideal for the web UI, but nothing outside the browser can call it in a stable way.
- **Auth is a cookie session** (`HttpOnly; SameSite=Lax`), optionally behind proxy SSO. That's perfect for a browser on the same origin, and awkward for a native client on a different origin.
- **Notifications already leave the box** through ntfy/Gotify/Apprise/Discord. Your phone can get reminders today via the ntfy app, with no Carvey app at all.
- **Offline doesn't work.** The service worker caches static assets but never stores pages, so its offline fallback always misses (B-16).

So the question is less "how do I get Carvey on my phone" and more "what is missing from the phone experience". It comes down to offline use (in a garage or car park with no signal), native push, faster capture (camera, odometer) and, optionally, App Store presence.

---

## 2. Options compared

| | **1. PWA** (improve what exists) | **2a. React Native / Expo** | **2b. Flutter** | **3. Native Swift + Kotlin** | **4a. Capacitor** | **4b. Tauri 2 mobile** |
|---|---|---|---|---|---|---|
| **What it is** | Same Next.js app, plus Web Push, an offline cache, camera capture and manifest shortcuts | New TypeScript/React app talking to a new JSON API | New Dart app talking to a new JSON API | Two new apps talking to a new JSON API | Native shell (WebView) around either the live site (remote URL) or a bundled static UI | Rust-based native shell around a WebView, similar to Capacitor |
| **Dev effort** | **S–M: 1.5–2 weeks** | L: 6–9 weeks + API | L: 7–10 weeks + API (new language) | XL: 12–20 weeks + API | **M: 1–2 weeks** in remote-URL mode (+ PWA work); 4–6 weeks for an offline bundled UI | M–L: as Capacitor, with a less mature plugin ecosystem |
| **Existing code reused** | ~100% | Types, date/mileage/format helpers from `lib/` (pure TS); all UI rewritten | Nothing directly | Nothing | Remote mode ~100%; bundled mode needs the API and client-side data fetching | As Capacitor |
| **Offline** | Read: cached pages and data via service worker. Write: queued with Background Sync on Android/Chrome; on iOS only while the app is open | Full: local SQLite + sync queue | Full: local SQLite + sync queue | Full | Remote mode: same as PWA. Bundled: full, as React Native | As Capacitor |
| **Push notifications** | Web Push (VAPID). Android/desktop: yes. iOS/iPadOS 16.4+: yes, **only when added to the home screen** | Native (APNs/FCM via Expo push) | Native (APNs/FCM) | Native | Native via `@capacitor/push-notifications` (needs Firebase + APNs key) | Native via plugins (younger) |
| **Away from home, through reverse proxy + auth** | Works exactly as the website does: cookies, Pangolin SSO redirects, 2FA all fine | Needs bearer tokens; proxy SSO in front blocks API calls unless the API path bypasses SSO, or you use VPN (Netbird) | Same as RN | Same as RN | Remote mode: like the PWA, but SSO redirects inside a WebView can break (some IdPs block embedded browsers). Bundled: as RN | As Capacitor |
| **Distribution** | None needed: "Add to Home Screen". No store, no fees, no review | App Store needs the $99/yr Apple Developer Program (TestFlight for personal use; review for public). Android: sideload APK or Play ($25 once) | Same as RN | Same as RN | Same as RN. **Apple often rejects thin website wrappers (guideline 4.2)** for public release; fine via TestFlight/ad-hoc for yourself | Same as Capacitor |
| **Ongoing maintenance** | Lowest: ships with the server, one codebase | Two codebases (web + app), API versioning, yearly SDK/Expo upgrades, store renewals | As RN, plus Dart | Highest: three codebases | Low in remote mode (shell rarely changes); medium bundled | As Capacitor, smaller community |
| **Best when** | One or few users, self-hosted, always-latest | You want a polished offline-first app or to publish it | You prefer Dart/Flutter | Deep OS integration (CarPlay, widgets, Siri) is the goal | You want an App Store/Play listing, native push or native plugins with little new code | You already use Tauri on desktop |

### Notes behind the table

- **iOS Web Push** works for PWAs added to the Home Screen (iOS 16.4+). The user must tap a button to grant permission; it can't be asked on page load. Delivery goes through Apple's push service, so the server needs outbound HTTPS (it already has this for ntfy).
- **Background Sync** (replaying queued writes when the connection returns) is Chromium-only. On iOS the PWA can queue writes in IndexedDB and send them the next time it's opened, which is enough for "log fuel in a car park, sync later".
- **Capacitor remote-URL mode** (`server.url`) loads the live site in the shell. It's the cheapest way to get a store-installable app with native push, camera and haptics. Its weakness is offline (none without a bundled UI) and SSO inside a WebView.
- **Tauri 2** supports iOS and Android, but mobile plugins (push especially) are less mature than Capacitor's. There's no advantage over Capacitor here.
- **Code reuse for React Native** is real but limited to logic: `lib/dates.ts`, `lib/mileage.ts`, `lib/format.ts`, `lib/reminders.ts` and the DB types are pure TypeScript. None of the UI (`components/*`, CSS) carries over.

---

## 3. Backend changes for a proper mobile client

**Needed for options 2, 3 and 4-bundled. Option 1 and Capacitor remote mode need none of this beyond Web Push.**

| Area | Change | Why |
|---|---|---|
| **API surface** | A versioned JSON API under `/api/v1/` as route handlers: `GET/POST/PATCH/DELETE` for vehicles, maintenance, repairs, MOTs, fuel, renewals, reminders, to-buy, plus `POST …/complete` for reminders and `POST /api/v1/attachments`. Reuse the existing `lib/db/*` functions and the shared zod validators. | Server actions aren't a stable contract: their IDs change every build |
| **Versioning** | URL prefix (`/api/v1`). Additive changes only within a version. A `GET /api/v1/meta` returning `{ apiVersion, appVersion, minClientVersion }` so the app can ask the user to update. | Phone apps update later than the server |
| **Auth tokens** | **Device tokens**: `POST /api/v1/auth/token` with username + password (+ TOTP) returns a random 256-bit token. Store only its SHA-256, exactly as `auth_sessions` does now. Send as `Authorization: Bearer`. List and revoke them in the existing "Signed-in devices" panel. Optional expiry (e.g. 90 days sliding). Same throttling as login. | Cookies don't work cross-origin from an app; long-lived device tokens avoid re-entering 2FA |
| **CSRF / origin** | Bearer-token requests skip the Origin check (they can't be forged by a browser); cookie requests keep it. | Keep CSRF protection without blocking the app |
| **CORS** | Only needed for a bundled WebView UI (Capacitor's origin is `capacitor://localhost` on iOS, `https://localhost` on Android). Allow exactly those origins for `/api/v1/*`, methods `GET, POST, PATCH, DELETE`, header `Authorization, Content-Type`, **no** `Access-Control-Allow-Credentials`. Native RN/Flutter/Swift apps don't need CORS. | Narrowest possible exposure |
| **Sync support** | `updated_at` on every record table (most already have `created_at`; some have `updated_at`), soft-delete tombstones (`deleted_at`) or a `deletions` log, and `GET /api/v1/changes?since=<cursor>`. Client-generated UUIDs (`client_id` column, unique) make retried offline writes idempotent. | Offline-first apps need delta sync and safe retries. The CSV double-import bug (B-05) is the same problem |
| **Pagination** | `?limit=&cursor=` on every list. | Also fixes M10 for the web |
| **Uploads** | Accept `Authorization` on attachment/photo uploads; enforce the same type sniffing (now in `lib/uploads.ts`); return JSON (`201` with the record) instead of a `303` redirect. Accept HEIC from iPhones by converting with `sharp` (already a dependency). | Phone cameras produce HEIC |
| **Push** | `POST/DELETE /api/v1/push-subscriptions` storing Web Push (VAPID) subscriptions or APNs/FCM tokens per device; the existing daily scheduler adds "push" as a delivery channel next to ntfy etc. VAPID keys generated on first start and kept in `app_settings` (stripped from showcase backups). | Reuses `selectDigestEntries`, so push and ntfy never disagree |
| **Docs** | An OpenAPI file generated from the zod schemas (`zod-openapi`). | Typed client generation for RN/Flutter |
| **Reverse proxy** | If Pangolin SSO protects the site, add a resource rule that lets `/api/v1/*` through to Carvey's own token auth (Pangolin supports path-based bypass rules on resources; check your version), or reach Carvey over Netbird from the phone instead. | SSO redirects can't be followed by an API client |

---

## 4. Getting through the reverse proxy and auth when away from home

| Setup | PWA | Native / Capacitor-bundled |
|---|---|---|
| Carvey password login, Pangolin with SSO off for this resource | ✅ works now | ✅ with device tokens |
| Pangolin SSO in front + Carvey proxy mode | ✅ (SSO cookie in the browser) | ⚠️ needs a bypass rule for `/api/v1/*`, or VPN |
| Netbird (or Tailscale/WireGuard) to the home network, no public exposure | ✅ while the VPN is on; Web Push still works (it's outbound from the server) | ✅ while the VPN is on |

For a single-user tool, the simplest secure setup is: Pangolin with TLS, **no** SSO on this resource, Carvey's own password + TOTP (now with a working rate limit), plus the edge rate limit from the runbook. That works for a PWA and for any future native client, with nothing special to configure.

---

## 5. Recommendation

**Build out the PWA first (option 1), then add a Capacitor shell only if you specifically want an App Store / Play install or native push on older iOS.** Don't build a React Native, Flutter or native app for this project.

Why:
- One admin user, self-hosted, server always reachable via Pangolin: the PWA already covers 80% of the need, and every improvement also improves the website.
- The real gaps (offline viewing, push, quick capture) can all be done in a PWA on current iOS and Android.
- A separate native app means a second codebase, an API contract to version, store accounts and review, which is ongoing cost that a single-user tool doesn't repay.
- Nothing is wasted if you change your mind later. The API work in §3 is what any native client would need, and the PWA's push and offline logic port directly into a Capacitor shell.

---

## 6. MVP feature set for the companion app (PWA)

1. **Push reminders.** Web Push digest at the configured hour, with a one-tap "Mark done" action that opens the pre-filled log form. Per-device opt-in in Settings → Notifications.
2. **Offline read.** Garage, each vehicle's overview, Reminders and the last 50 records per vehicle readable with no signal. A "last synced" banner when showing cached data.
3. **Offline quick log.** Fuel fill-up and odometer reading saved offline and sent when back online (idempotent via a client-generated ID).
4. **Camera-first receipts.** "Add receipt" opens the rear camera directly; photo attached to the chosen record. HEIC accepted.
5. **Home-screen shortcuts.** Manifest `shortcuts`: *Log fuel*, *Update mileage*, *Reminders*. Long-press the icon to jump straight in.
6. **Share target.** Share a PDF invoice from email to Carvey and pick the vehicle and record to attach it to (`share_target` in the manifest; Android and desktop, not iOS).
7. **Quick odometer update** on each garage card, so mileage-based estimates stay accurate.

Out of scope for the MVP: editing settings offline, restore/import on mobile, multi-user.

---

## 7. Build plan

| Phase | Work | Effort | Outcome |
|---|---|---|---|
| **0. Foundations** | Pagination for record tabs (IMPROVEMENTS #4); inline validation errors (#6); quick odometer update (Q2); camera capture attribute (Q3); HEIC for attachments | 3–4 days | Faster, friendlier phone UI on the existing site |
| **1. Push** | VAPID key generation; `push_subscriptions` table + endpoints; `push` channel in the scheduler reusing `selectDigestEntries`; `push` and `notificationclick` handlers in `sw.js`; opt-in UI; tests for digest → push payload | 3–4 days | Reminders arrive as native notifications on Android, desktop and home-screen iOS |
| **2. Offline read** | Service worker: network-first for navigations with a capped page cache, an `/offline` page, cache versioning per release, explicit no-cache list (backup, export, attachments); "last synced" banner | 2–3 days | Garage, vehicles and reminders viewable with no signal |
| **3. Offline quick log** | Client-side IndexedDB outbox for fuel and odometer; `client_id` unique column + idempotent insert; replay on `online` / app open, Background Sync where available; conflict rule: last write wins, duplicate `client_id` ignored | 3–4 days | Log fuel in a car park; it syncs later, never twice |
| **4. Shortcuts and share target** | Manifest shortcuts; `share_target` route that stages the file and shows a vehicle/record picker | 1–2 days | Faster capture |
| **Total MVP** | | **≈ 2.5–3.5 weeks** | |
| **5. Optional: Capacitor shell** | Device tokens + `/api/v1` subset (vehicles, reminders, fuel, attachments); Capacitor app in remote-URL mode with native push (FCM/APNs) and camera; Pangolin bypass rule or Netbird; TestFlight / APK | 1.5–2 weeks | Store-installable app with native push |

**Testing per phase:** unit tests for new server code in the existing Vitest suite; Playwright with the service worker enabled and `context.setOffline(true)` for phases 2–3; a manual pass on one iPhone (home-screen install) and one Android phone per phase.
