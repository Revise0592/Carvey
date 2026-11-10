# Changelog

All notable changes to Carvey will be documented here.

## [Unreleased]

### Added

- **Notifications**: a daily summary of reminders that are coming up or due, sent to ntfy, Gotify, Apprise, Discord or a generic webhook. Set the warning window and send time in **Settings → Notifications**, with **Send test** and **Check now** buttons
- **Calendar feed**: a private subscription link that shows every open reminder as an all-day event, with an alert before it's due
- **Mileage-based due dates**: Carvey works out how far each car is driven from its odometer readings, then shows when mileage-only reminders are likely to fall due (for example "≈ 14 Mar 2027"). Reminders are sorted by that date, and the vehicle overview shows typical yearly distance and an estimated current reading
- **Renewals**: a new vehicle tab for insurance, road tax, warranty and breakdown cover, with provider, policy number, dates, cost and attached documents. Each type keeps one reminder on the latest renewal date. Ticking it opens a pre-filled renewal form, with a "Not renewing" option. Renewal costs count towards spend and the Costs page
- **CSV export**: export any record type for one vehicle or all of them, or everything as a zip of CSV files
- **Two-factor authentication**: authenticator-app codes (TOTP) with 10 single-use recovery codes, set up from **Settings → Admin**. Recover with `reset-password.mjs --disable-2fa` or `CARVEY_RESET_2FA=true`
- **Reverse-proxy sign-in** (`CARVEY_AUTH_MODE=proxy`): trust Authelia, Authentik and similar via a shared secret header, while direct access to the port still requires a password
- **Signed-in devices**: see active sessions and sign any of them out
- **CSV import**: import maintenance, repairs, MOTs, fuel or renewals from a spreadsheet or another app. Columns are matched by name or common alias. Day-first and month-first dates and most number formats work, and rows can be matched to vehicles by registration. A preview shows exactly what will be imported, skipped or treated as a duplicate
- App-style navigation: on phones and tablets, a compact top bar (back button and page title on sub-pages) and a bottom tab bar for Garage, Reminders, Costs and Settings
- Quick-add button (centre of the bottom bar, or **Add** on desktop) to log maintenance, repairs, MOTs, fuel, reminders, To Buy items or photos for any vehicle, or add a new vehicle
- **Reminders** page listing open reminders and MOT expiry across all vehicles, grouped by overdue / upcoming
- **Costs** page with spend by month, by type and by vehicle, per year or all time, plus recent spending
- Settings is now a menu on mobile that drills into each section, and a sidebar on desktop

### Changed

- Vehicle pages are much lighter: each tab now loads only its own data, and edit forms are no longer sent with every row. A Fuel tab with 150 fill-ups went from 591 KB to 246 KB (about 15 KB gzipped)
- Fuel fill-ups now count as odometer readings for a vehicle's current mileage
- Regional settings load in one query instead of nine
- Internal: the data layer and server actions are split into modules by area, and the vehicle page into one file per tab
- Refreshed design: flatter cards, a native system font, a sticky translucent top bar and sticky vehicle section tabs that keep the active tab in view
- Forms open as bottom sheets on mobile with a fixed header and a scrolling body
- Vehicle page header is more compact on mobile, with Photo / Print / Edit side by side
- Garage vehicles show as a compact list on mobile

### Fixed

- **Restoring a backup lost fuel records, service plans, attachments and gallery photos.** Restore now copies every table, so nothing is left out, including anything added in future
- The garage "Open reminders" count stopped at 8
- A lint error in the Install App panel
- Long forms in pop-ups could be cut off on mobile, hiding the save button
- Record rows on mobile stranded the Edit button on its own line and squeezed titles beside the badge
- Badges of different widths misaligned record titles on desktop
- Edit and Delete buttons on Garages, Categories and Service Intervals cards stacked awkwardly
- "Spent this year" on the garage left out fuel, so it didn't match the per-vehicle totals
- Dashboard reminders with only a mileage due were listed before dated ones
- Assigning a service interval always said "miles", even with kilometres selected

### Security

- Backups no longer contain login sessions. Session tokens were stored as-is and copied into every backup, so a backup file could be used to sign in for up to 30 days. Tokens are now stored as SHA-256 digests (existing sessions are upgraded on first use, so nobody is logged out), and backups strip sessions, 2FA challenges and login counters
- Sign-in is rate limited per client and per account. Failed sign-ins take the same time whether or not the username exists
- Upload, restore and import endpoints reject cross-site requests. Before, another app on a sibling subdomain could post to them with your session
- Turning sign-in off now needs your password (and 2FA code). Restoring a backup can no longer change the sign-in mode
- Changing your password, or turning 2FA on or off, signs out every other device
- Security headers on every response (no framing, `nosniff`, referrer policy). Uploaded files are served sandboxed so they can never run as a page
- Setup can only ever create one admin, even if two requests race
- A password shorter than 8 characters on the login form caused a server error instead of "Those details did not match"

- Upgraded Next.js to 16.4.3 (fixes critical unauthenticated RCE and SSRF advisories in Image Optimization, plus cache poisoning and Server Actions DoS)
- Upgraded sharp to 0.35.5 (bundled libvips, libheif and librsvg fixes for crafted image uploads)
- Upgraded adm-zip to 0.6.1 (fixes symlink overwrite, zip bomb and SUID issues when restoring backups)
- Updated dev/build tooling (vitest, postcss and transitive packages); `npm audit` now reports 0 vulnerabilities

## [1.0.9] - 2026-10-14

### Added

- Garage/Workshop field on maintenance records
- Ticking the MOT reminder opens a form to log the MOT
- Ticking a Service Plan reminder opens a form to record the service
- Completed reminders can be removed directly from the list

### Fixed

- To Buy and other record lists overflowing the screen on mobile, leaving Edit/Delete off-screen
- Tab strips overhanging the page edge on small phones
- Record titles truncated on mobile
- Printable history tables overflowing on mobile
- Long data directory path overflowing in Settings → Backup
- Logging an MOT or recording a Service Plan service left the old completed reminder behind instead of resetting it
- Repeating reminders (e.g. every 12 months / 5,000 miles) not resetting when ticked
- Editing an older MOT moving the MOT reminder to that test's expiry date
- Reminders sorted with completed ones first

## [1.0.8] - 2026-07-14

### Fixed

- Adding an attachment returning you to the overview tab instead of the record

## [1.0.7] - 2026-07-07

### Added

- Annual vehicle test terminology now offers "Inspection" alongside "MOT", plus a "Custom" option to type your own name for it (e.g. "Kontroll", "TÜV", "Roadworthy Certificate") — replaces the old fixed "Emissions Test" choice, which still loads correctly for existing installs
- Gallery photos can now be edited after upload — change the caption or the record it's linked to via a new "Edit" button on each photo

### Fixed

- Deleting a gallery photo now requires confirmation, matching every other record type in the app — previously it deleted immediately on click with no confirmation step

## [1.0.6] - 2026-07-06

### Added

- Currency setting now supports every ISO 4217 currency, not just GBP/USD/EUR
- New independent "Fuel volume unit" setting (Litres / Gallons) in Settings → Regional, controlling volume and fuel economy display (litres vs gallons, mpg vs L/100km)

### Fixed

- Fuel volume and economy units were previously inferred from currency (only USD showed gallons/mpg), which could show the wrong units for currency/distance combinations outside GBP, USD, and EUR — this is now controlled by its own setting

## [1.0.5] - 2026-06-21

### Added

- Fuel logging — record fill-ups per vehicle with date, odometer, volume, cost, fuel type, and notes; displayed as a sortable list on the vehicle page
- Vehicle photo gallery — browse all uploaded photos for a vehicle in a scrollable grid; photos are sourced from maintenance, repair, and other record attachments

## [1.0.4] - 2026-06-16

### Changed

- Maintenance, repairs, MOTs, reminders, and to buy tabs now display records as a sortable list rather than a card grid — easier to scan as entries accumulate
- Record lists are enclosed in a panel with a clear outer border, so single-entry lists look contained rather than floating on a bare divider line
- Sort controls appear above each list — click to sort by date, cost, category, status, or name depending on the tab; click again to reverse direction

### Fixed

- Switching tabs and changing sort order no longer jumps the page back to the top — scroll position is preserved on navigation
- Admin settings page on mobile no longer crams the Authentication panel into a hardcoded second column — it now stacks correctly in a single column on narrow screens

## [1.0.3] - 2026-06-16

### Added

- Password reset for locked-out users via two recovery paths: a CLI script (`node scripts/reset-password.mjs` inside the container) and a `CARVEY_RESET_PASSWORD` startup environment variable, following the same pattern as Grafana's admin password reset

## [1.0.2] - 2026-06-15

### Added

- PWA support — Carvey can now be installed as a standalone app on mobile and desktop via the browser install prompt
- Install prompt surfaced in Settings → Personalisation
- Web app manifest with icons at 192×192, 512×512, and maskable 512×512
- Service worker with cache-first for static assets and network-first for navigation
- Safe-area padding on the app shell and top bar for iPhone notch and home bar
- Drag handle pill on mobile bottom-sheet modals

## [1.0.1] - 2026-06-14

### Fixed

- Settings tabs no longer wrap onto a second line breaking the container shape — tabs now wrap cleanly inside a rounded rectangle at any width
- Page and tab transitions now animate correctly when switching between tabs on the vehicle and settings pages

## [1.0.0] - 2026-06-14

Initial public release.

### Garage

- Multi-vehicle garage — manage any number of vehicles in one place
- Vehicle profiles with make, model, year, purchase date, purchase price, and notes
- Odometer tracking with a running effective mileage figure
- Vehicle photo upload with automatic thumbnail generation
- Mark vehicles as sold
- Printable full service history report per vehicle

### Dashboard

- Overview stats: total vehicles, spend this calendar year, open reminders, and planned purchases
- Upcoming MOT / Emissions Test panel showing tests due in the next 45 days
- Open reminders panel across all vehicles
- Planned purchases panel across all vehicles

### Maintenance & Repairs

- Log maintenance entries with category, description, date, mileage, cost, and notes
- Log repair entries with garage/workshop, fault description, date, mileage, cost, and notes
- File attachments on any entry — receipts, invoices, photos (PDF and images supported)

### MOT / Emissions Tests

- Log test results (pass/fail/advisory) with test date, expiry date, mileage, and cost
- Configurable label: MOT, Emissions Test, or disabled entirely for regions that don't use it

### Reminders

- Create reminders triggered by a due date or a mileage threshold
- Mark reminders as complete

### To Buy / Planned Purchases

- Track parts and items you intend to buy, with name, estimated cost, and notes
- Mark items as purchased with an actual purchase date, converting them to a purchase record
- Convert a purchased item directly into a maintenance or repair log entry

### Service Plan

- Define reusable service intervals (e.g. oil change every 6 months / 6,000 miles)
- Assign intervals to individual vehicles and link them to reminder entries

### Settings — Personalisation

- Light and dark mode with system preference detection
- Ten colour palettes: Factory, British Racing Green, Midnight Alloy, Tan Leather, Signal Red, Petrol Blue, Heritage Cream, Oxford Blue, Burgundy Velour, Champagne Gold
- Rounded and boxy shape variants
- Custom collection name

### Settings — Regional

- Currency: GBP (£), USD ($), EUR (€)
- Distance unit: miles or kilometres
- Date format: `DD Mon YYYY` or ISO 8601 (`YYYY-MM-DD`)
- Registration plate colour: yellow (UK rear) or white (UK front)
- Annual test feature: MOT, Emissions Test, or disabled

### Settings — Admin

- Username and password management
- Optional authentication disable for deployments behind a trusted reverse proxy

### Settings — Garages & Workshops

- Maintain a list of garages and workshops to attach to repair records

### Settings — Maintenance Categories

- Custom maintenance categories for organising service entries

### Settings — Backup & Restore

- Export a full backup archive (database + uploads)
- Restore from a backup archive
- Preview restore contents before committing

### Infrastructure

- Self-hosted, local-first — no external services or accounts required
- Data stored in SQLite with file uploads alongside the database
- Docker image published to GitHub Container Registry (`ghcr.io/revise0592/carvey`)
- Standalone Next.js output for lightweight deployment
