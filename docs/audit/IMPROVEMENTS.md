# Proposed improvements (not implemented)

Ordered by value for effort. Effort assumes one developer who knows the codebase: **XS** < 1 h · **S** ½ day · **M** 1–2 days · **L** 3–5 days. Items marked 🛠 also need a step from [RUNBOOK.md](RUNBOOK.md).

## Fixes for remaining Medium / Low findings

| # | Finding | Proposal | Effort |
|---|---|---|---|
| 1 | M7 lockout DoS | Issue a signed "known device" cookie on successful sign-in; clients holding it are exempt from the per-account lock (still subject to their own per-client limit). Turn the per-account lock into a progressive delay (1 s, 2 s, 4 s … capped at 30 s) instead of a hard block. | S |
| 2 | M12 manual backups 🛠 | Nightly built-in backup to `data/backups/carvey-YYYY-MM-DD.zip`, keep 14, shown in Settings → Backup with "last backup" status. Your restic job then copies the folder off-box. Reuse the scheduler in `instrumentation.ts`. | S |
| 3 | M8 memory-bound backups | Stream the backup zip to the response (`yazl`/`archiver`) and stream restore uploads to disk; reject entries whose uncompressed size or total exceeds a limit before extracting. | M |
| 4 | M10 pagination | Latest 50 records per tab with "Show more" (cursor on `date, id`); same for Fuel. Print view stays complete. | S |
| 5 | M11 CSP | Nonce-based CSP via `proxy.ts` (`script-src 'self' 'nonce-…' 'strict-dynamic'`), shipped as Report-Only for a week first. HSTS at the proxy. | S |
| 6 | L13 validation UX | Move record forms to `useActionState`; actions return `{ fieldErrors }` from `safeParse` instead of throwing, and forms show them inline. Also removes the generic error page for B-19. | M |
| 7 | L7 re-auth throttling | Apply the login throttle keys to `verifyReauthentication`, `confirmTotpSetup` and `regenerateRecoveryCodes`. | XS |
| 8 | L5 offline PWA | In `sw.js`, cache successful navigations (network-first, cache on success, cap at ~50 entries) and pre-cache an `/offline` page. Never cache `/settings/backup`, `/settings/export`, `/uploads/attachments`. Bump `CACHE_NAME` on release. | S |
| 9 | L8 trusted proxy 🛠 | `CARVEY_TRUSTED_PROXIES` (CIDR list); honour `X-Forwarded-For` only from those peers. | S |
| 10 | L11 health | `/api/health` runs `SELECT 1` and checks the data dir is writable; returns 503 otherwise. Keep it unauthenticated but free of detail. | XS |
| 11 | L9 duplicate digest | In-process mutex around `runDailyNotifications`; insert the `notification_log` keys before sending and delete them if sending fails. | XS |
| 12 | B-18 restore UX | Keep the current session when restoring (re-create it after the swap), so the success message is seen. | XS |
| 13 | L10 pruning | On startup and daily: keep the newest 3 `restore-rollback/*`, delete `restore-staging/*` and `tmp/csv-import/*` older than 24 h. Show used disk in Settings → Backup. | S |
| 14 | L6 URL scheme | Validate To Buy URLs as `http(s)://`. | XS |
| 15 | L12 audit log | `audit_log` table (time, event, client IP, user agent) for sign-in, failed sign-in, 2FA changes, restore, import, settings; last 100 shown in Settings → Admin. Rows stripped from showcase backups. | S |
| 16 | CI | Add a `test` job (`npm ci && npm test && npx tsc --noEmit && npm run lint`) that the image build `needs`. Add Dependabot/Renovate for npm, the base image digest and Actions. | XS |
| 17 | Dependencies | Next 16.4.6 + React 19.3.1 + better-sqlite3 12.11.1 together, then a full test and smoke run. | XS |
| 18 | L14 tidy-ups | Read the backup `appVersion` from `package.json`; move `allowedDevOrigins` to an env var; rename `vitest.config.ts` → `.mts`; move `@types/better-sqlite3` to devDependencies; drop or wire up the unused `archived` column. | XS |
| 19 | Code quality | Split `components/Forms.tsx` by domain; one `recordInput(formData)` helper for the date/odometer/cost/garage/notes block repeated across actions. | S |
| 20 | Perf | Generate thumbnails for gallery photos (served full size today); composite `(vehicle_id, odometer)` indexes on the four record tables. | S |

## Quality-of-life features

| # | Feature | Why | Effort |
|---|---|---|---|
| Q1 | **Web Push for reminders** | The PWA can receive push notifications natively (Android, desktop, and iOS 16.4+ once installed to the home screen) with no ntfy/Gotify in between. Also the foundation for the mobile app. See [MOBILE.md](MOBILE.md). | M |
| Q2 | **Quick odometer update** | One-tap "Update mileage" on the garage card. Mileage-based reminders and estimates depend on fresh readings, and logging a fake fuel record is the only quick way today. | XS |
| Q3 | **Receipt capture from camera** | `accept="image/*" capture="environment"` on attachment and gallery inputs, so the phone opens the camera directly. | XS |
| Q4 | **Fuel economy chart** | mpg / L/100 km between full-tank fill-ups, per vehicle, with a trend line. The data is already there. | S |
| Q5 | **Reminder snooze** | "Remind me in 1 week / at +500 miles" without editing the due date. | S |
| Q6 | **Global search** | Search descriptions, notes, garages and registrations across all vehicles ("when did I last do the brakes?"). SQLite FTS5 makes this cheap. | S |
| Q7 | **DVLA / MOT history import (UK)** | Pull MOT history and tax status from the DVSA MOT History API by registration (free API key). Removes most manual MOT entry. | M |
| Q8 | **Share a read-only vehicle history** | Expiring signed link to the print view for a buyer, instead of exporting a PDF. | S |
| Q9 | **Read-only second user** | A household member who can view and log fuel but not change settings. The schema already has `admin_users`; add a role column. | M |
| Q10 | **Cost per mile** | Total running cost ÷ distance driven since purchase, on the overview and Costs page. | XS |

## Suggested order

1. **Next release (≈1 day):** #7, #10, #11, #12, #14, #16, #17, #18, Q2, Q3. All XS, all low risk.
2. **Then (≈1 week):** #1, #2, #4, #5, #8, #13, Q4.
3. **Before building a mobile app:** the API work in [MOBILE.md](MOBILE.md) §3, plus #3 and #6.
