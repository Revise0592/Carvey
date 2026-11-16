# Bug log

## Test suite results

| Run | Command | Result |
|---|---|---|
| Baseline (`94b8875`) | `npm test` | **121 passed / 121**, 20 files, 3.3 s |
| Baseline | `npx tsc --noEmit` | clean |
| Baseline | `npm run lint` | 0 errors, 2 warnings (`<img>` in `GalleryGrid.tsx`) |
| Baseline | `npm audit` | 1 high (`zod`, runtime), 8 moderate (eslint toolchain, dev only) |
| New regression tests, before fixes | `npx vitest run test/audit-regressions.test.ts` | 9 failed / 10 (each failure reproduced a bug below) |
| After fixes (this branch) | `npm test` | **137 passed / 137**, 21 files |
| After fixes | `tsc`, `lint`, `npm audit --omit=dev` | clean · 0 errors · 0 vulnerabilities |

A test framework already existed (Vitest, `test/*.test.ts`, each test on a fresh temp data dir), so I extended it rather than adding a new one. The new file is `test/audit-regressions.test.ts`. It covers core flows and the edge cases the brief asked for:

| Edge case | Test |
|---|---|
| Concurrent requests | 20 parallel logins; two simultaneous CSV import confirms |
| Bad input | non-dates, `2026-02-31`, `abc` costs, negative odometers, mislabelled uploads, `.html` named uploads |
| Empty states | restoring a backup with no admin; empty optional fields → `null` / `0` |
| Expired / forged sessions | covered by the existing `auth.test.ts`, re-checked live (see B-13) |
| Large payloads | file-size limits already tested in `photo-upload.test.ts`; 25 MB upload cap and 1 MB server-action limit checked by reading |
| Time zones | `todayIso()` at 00:30 BST and 09:00 AEDT |

## Exploratory testing

Run against a local production build (`npm run build`, `node .next/standalone/server.js`) on `127.0.0.1:3123`, `TZ=Europe/London`, scratch data dir, driven by Playwright scripts and `curl`. Probes: first-run setup, every empty state, missing and malformed IDs, hostile form values (browser validation stripped), forged session cookies, unauthenticated access to uploads/export/calendar, a cross-site upload POST, restoring a re-zipped backup, and a 20-vehicle / 20,000-record dataset for timing.

## Bugs

Severity matches [AUDIT.md](AUDIT.md). "Found by" is *code* (reading), *test* (automated), or *explore* (running the app).

### B-01 · High · Parallel wrong passwords bypass the login rate limit · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** create an admin; send 20 sign-in attempts with a wrong password at the same time (`Promise.all` of `login()`; or 20 parallel form POSTs).
- **Expected:** 5 attempts checked, the other 15 refused with "Too many failed attempts".
- **Actual:** all 20 checked, 0 throttled. The limit only works for sequential guesses.
- **Fix:** commit `61ffa36`.

### B-02 · High · Restoring a backup without an admin deletes the account · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** sign in; Settings → Backup → restore `data/demo/showcase-backup.zip` (or any backup taken before setup); confirm.
- **Expected:** your data is replaced; your account remains.
- **Actual:** `admin_users` is emptied. Every page now redirects to `/setup`, where anyone can create a new admin.
- **Fix:** commit `36eef23`.

### B-03 · High · A non-date purchase date breaks the vehicle page permanently · ✅ fixed
- **Found by:** explore.
- **Steps:** Add vehicle; with browser validation bypassed (no native date picker, or devtools), enter purchase date `next tuesday`; save.
- **Expected:** "Enter a date" error, nothing saved.
- **Actual:** saved. `/vehicles/<id>` then returns an error page on every load (`RangeError: Invalid time value` in `formatDate`). The same applied to `2026-02-31`, cost `abc` (stored as NaN/NULL), odometer `-500`.
- **Fix:** commit `c7b139d` (validation + `formatDate` tolerates bad stored values; the already-broken test vehicle loads again).

### B-04 · Medium · Daily digest and "overdue" use the UTC date · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** `TZ=Europe/London`, clock at 00:30 BST on 2 July. Or `TZ=Australia/Sydney`, notification hour 9, clock at 09:00 on 3 March.
- **Expected:** today = 2 July / 3 March.
- **Actual:** today = 1 July / 2 March. In Sydney the digest records yesterday's date at 09:00 and runs again at 11:00 (UTC midnight). Reminders turn overdue at UTC midnight; new records late in the evening default to yesterday.
- **Fix:** commit `52f8e1f`.

### B-05 · Medium · Double-clicking "Import" imports the CSV twice · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** Settings → Import & Export; upload a CSV; on the preview, submit "Import" twice quickly (or retry on a slow connection).
- **Expected:** rows imported once.
- **Actual:** every row imported twice.
- **Fix:** commit `61f69e1`.

### B-06 · Medium · Deleting a vehicle leaves its documents on disk · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** add a vehicle; attach a PDF to a maintenance record and a gallery photo; delete the vehicle; look in `data/uploads/attachments/<id>/`; take a backup.
- **Expected:** files gone.
- **Actual:** files remain on disk and are included in every later backup.
- **Fix:** commit `4b2317f`.

### B-07 · Medium · Upload stored under the client's extension; upload to a missing record → 500 and orphan file · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps (a):** POST `/api/attachments` with a file named `notes.html`, type `text/plain`. **(b):** POST with a `vehicleId`/`recordId` that doesn't exist.
- **Expected:** (a) stored as `.txt` (or refused if the content doesn't match). (b) 404, nothing written.
- **Actual:** (a) stored as `<id>-<uuid>.html`. (b) file written to disk, then `FOREIGN KEY constraint failed` → 500, file left behind.
- **Fix:** commit `dbba78b`.

### B-08 · Medium · Recovery command fails in the Docker image · ✅ fixed
- **Found by:** explore (built the standalone output and reproduced the runner layout).
- **Steps:** `docker exec -it carvey node scripts/reset-password.mjs`.
- **Expected:** prompts for a new password.
- **Actual:** `Cannot find module '/app/scripts/reset-password.mjs'`; with the script copied in, `Cannot find package 'bcryptjs'`.
- **Fix:** commit `e5b2dc2`. Needs a new image (see runbook).

### B-09 · Low · Setup with a short password shows a server error · ✅ fixed
- **Found by:** explore.
- **Steps:** `/setup` with browser validation bypassed; password `short`.
- **Expected:** a message asking for 8+ characters.
- **Actual:** unhandled `ZodError` in the server log; the browser gets a generic error (client logs React error #441).
- **Fix:** commit `c7b139d`.

### B-10 · Low · Attachment downloads saved as `My%20receipt.pdf` · ✅ fixed
- **Found by:** code, confirmed by test.
- **Steps:** attach `Facture été.pdf`; download it.
- **Expected:** saved as `Facture été.pdf`.
- **Actual:** saved as `Facture%20%C3%A9t%C3%A9.pdf`.
- **Fix:** commit `aabb1d8`.

### B-11 · Low · "No mots logged yet" · ✅ fixed
- **Found by:** explore.
- **Steps:** fresh install, open Garage or Reminders, or a vehicle with no MOTs.
- **Expected:** "No MOTs logged yet", "No MOT logged".
- **Actual:** "No mots logged yet", "No mot logged", "start logging mots, repairs…".
- **Fix:** commit `5e70807`.

### B-12 · Low · Re-zipped backup refused as unsafe · ✅ fixed
- **Found by:** explore.
- **Steps:** download a backup; unzip it; zip the folder again with Finder or 7-Zip; restore it.
- **Expected:** preview shown.
- **Actual:** "Backup contains an unsafe file path." (the folder entry `uploads/` failed the path check).
- **Fix:** commit `ed860a1`.

### B-13 · Info · Checks that passed
Forged session cookie → `/login`; `/settings/backup` with a forged cookie → 307 to `/login`; `/uploads/*` unauthenticated → 404; `/uploads/../carvey.sqlite` → 404; unknown calendar token → 404; cross-site multipart POST with a valid session → 403; `/vehicles/99999`, `/vehicles/abc`, `/vehicles/-1/print` → 404; all empty states render with sensible copy; security headers present on every response.

### Open bugs (not fixed here)

| ID | Severity | Bug | Steps | Proposed in |
|---|---|---|---|---|
| B-14 | Medium | Owner can be locked out by anyone | 25 wrong passwords for `admin` from any client within 15 min → the owner gets "Too many failed attempts" for 15 min, repeatable forever | IMPROVEMENTS #1 |
| B-15 | Medium | Maintenance tab sends 1.3 MB of HTML at 500 records | Seed 500 services on one car; open the tab on a phone | IMPROVEMENTS #4 |
| B-16 | Low | Offline fallback never works | Install the PWA; open a vehicle; go offline; reload → browser offline page. `sw.js` never stores navigations, so `caches.match()` always misses | IMPROVEMENTS #8 |
| B-17 | Low | Digest can be sent twice | Press "Check now" while the 15-minute scheduler tick is running → two identical notifications | IMPROVEMENTS #11 |
| B-18 | Low | Restore signs you out, so its "success" message is never seen | Restore a backup → redirected to `/login` with no confirmation | IMPROVEMENTS #12 |
| B-19 | Low | Validation errors show a generic error page | Any server-side rejection (B-03 case now) shows "Application error" rather than the field message | IMPROVEMENTS #6 |
