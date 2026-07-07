# Changelog

All notable changes to Carvey will be documented here.

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
