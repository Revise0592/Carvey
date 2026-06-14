# Changelog

All notable changes to Carvey will be documented here.

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
