# Code changes

Branch `claude/gracious-shannon-9awbyt`, on top of `main` at `94b8875`. Every change is its own commit, so each can be reviewed, reverted or cherry-picked alone. Nothing here changes the database schema, and none of it needs a migration.

Run the checks yourself:

```bash
npm ci
```

```bash
npm test && npx tsc --noEmit && npm run lint
```

| # | Commit | Finding | Files | What changed and why |
|---|---|---|---|---|
| 1 | `61ffa36` | H1 / B-01 | `lib/auth.ts` | Charges a failed attempt **before** the async bcrypt check, in the same synchronous step as the limit check, so parallel requests can't all slip under the limit. A correct password gets its attempt refunded, so normal sign-in is unchanged. |
| 2 | `36eef23` | H2 / B-02 | `lib/backup.ts` | If the backup being restored has no admin user, the live `admin_users` table is kept. Backups that do contain an admin restore exactly as before. |
| 3 | `52f8e1f` | M1 / B-04 | `lib/dates.ts`, `lib/db/reminders.ts`, print page | `todayIso()` returns the local calendar date (container `TZ` on the server, the device's in the browser). `addMonths()` now works in UTC so it can't drift a day. Two places that built "today" from `toISOString()` now call `todayIso()`. |
| 4 | `61f69e1` | M2 / B-05 | `lib/data-transfer.ts` | `commitCsvImport` claims the staged preview with an atomic `rename()` before importing. A second concurrent confirm finds nothing to claim and gets "expired or already imported". |
| 5 | `4b2317f` | M3 / B-06 | `app/actions/vehicles.ts` | Deleting a vehicle also removes `uploads/attachments/<vehicleId>/` (attachments and gallery photos). |
| 6 | `dbba78b` | M4 / B-07 | new `lib/uploads.ts`, `lib/db/media.ts`, both upload routes | Stored extension comes from the allowed MIME type, never the file name. Leading bytes must match the type (PDF/JPEG/PNG/WebP signatures; no NUL bytes for text). The vehicle/record must exist and belong together (404 otherwise), checked **before** anything is written. If the DB insert fails, the file is deleted. File names and captions are length-capped. The two routes now share this code instead of duplicating it. |
| 7 | `aabb1d8` | L1 / B-10 | `app/uploads/[...path]/route.ts` | `Content-Disposition` sends an ASCII fallback plus `filename*=UTF-8''…` (RFC 6266), so downloads keep their real names. |
| 8 | `3d684b8` | M5 | `package.json`, lockfile | `zod` 4.4.1 → 4.6.7 for GHSA-mrhx-c7xc-m3w5. `npm audit --omit=dev` is clean. |
| 9 | `e5b2dc2` | M6 / B-08 | `Dockerfile` | Copies `scripts/reset-password.mjs` and `bcryptjs` into the runtime stage so the README's `docker exec … reset-password.mjs` works. Adds about 150 KB to the image. |
| 10 | `0d61d7c` | — | `test/audit-regressions.test.ts` | Regression tests for commits 1–7. Each failed before its fix. |
| 11 | `c7b139d` | H3 / B-03, L4 / B-09 | `app/actions/*.ts`, `lib/format.ts`, setup page | New `isoDate`/`nullableIsoDate` helpers (real `YYYY-MM-DD` dates only) used by every action that takes a date. `nullableInt` rejects non-numbers and negatives; `money` rejects non-finite values. `formatDate` returns an unparseable stored value as-is instead of throwing, which un-breaks any page already holding bad data. Setup with an invalid username/password redirects with a message instead of a 500. Tests added. |
| 12 | `5e70807` | L2 / B-11 | `lib/regional-settings.ts` + 5 pages | `motLabelInSentence()` lower-cases "Inspection" mid-sentence but leaves acronyms such as "MOT" or "TÜV" alone. Test added. |
| 13 | `ed860a1` | L3 / B-12 | `lib/backup.ts` | Folder entries in a backup zip (`uploads/`) pass the path-safety check without their trailing slash. Unsafe paths are still refused (the existing traversal test still passes). Test added. |

**Behaviour you might notice after upgrading**

- An upload whose contents don't match its type (for example a `.png` that is really a HEIC from an iPhone share sheet) is now refused with a clear message. Vehicle *photos* still accept HEIC/AVIF; this applies to attachments and gallery uploads, which never accepted HEIC.
- Existing attachments keep the names they were stored under; only new uploads use the new naming.
- Odometer fields now refuse negative numbers, and costs must be numbers. The forms already prevented both, so normal use is unaffected.

**Not changed (deliberately):** the schema, the auth model, the UI layout, `docker-compose.yml` (your live copy may differ, so the hardening is in the runbook instead) and the release/CI workflow.
