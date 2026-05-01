# Carvey

Carvey is a self-hosted car maintenance dashboard for a household garage. It is designed for people who want a simple local-first way to track cars, maintenance, repairs, MOTs, reminders, costs, and vehicle photos without depending on a hosted service.

The app is currently UK-first: miles, GBP, UK date formatting, and MOT terminology are used throughout.

## Features

- Garage dashboard for multiple vehicles
- Vehicle profiles with registration, VIN, mileage, purchase price, purchase date, notes, and photo
- Vehicle photo upload with automatic WebP resizing and thumbnail generation
- Maintenance, repair, MOT, and reminder logs
- Edit and delete support for vehicles and log entries
- Automatic MOT reminder creation from MOT expiry dates
- Date and mileage based reminders
- Dark, light, and system appearance modes
- Single-household login
- Complete backup and restore from the Settings UI
- Docker-first deployment with persistent `/app/data` storage

## Screenshots

Screenshots will be added once the UI settles a little more.

## Tech Stack

- Next.js
- React
- TypeScript
- SQLite via `better-sqlite3`
- Sharp for image optimisation
- Vitest for tests
- Docker for deployment

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

On first run, Carvey will ask you to create the household admin account.

### Environment Variables

Create a `.env.local` or use the Docker environment values:

```bash
CARVEY_DATA_DIR=./data
TZ=Europe/London
CARVEY_DEBUG_EASTER_EGGS=false
```

Carvey stores login sessions in its SQLite database, so there is no session secret to create or manage. Cookies are marked HTTPS-only automatically when production requests arrive through HTTPS, while plain HTTP LAN installs continue to work.

`CARVEY_DEBUG_EASTER_EGGS=true` enables deliberately hidden debug controls, including non-production visual easter eggs on vehicle pages.

## Docker

Build and run with Docker Compose:

```bash
docker compose up -d --build
```

The app listens on port `3000`.

Published images are available from GitHub Container Registry:

```bash
docker pull ghcr.io/revise0592/carvey:latest
```

The GitHub Actions workflow builds the container for pushes to `main`, publishes `latest`, and also publishes an immutable SHA tag.

Persistent data is stored in `/app/data` inside the container. The included compose file maps this to `./data`:

```yaml
volumes:
  - ./data:/app/data
```

The data directory contains:

- `carvey.sqlite`
- uploaded and optimised vehicle images
- restore staging and rollback folders when using the restore feature

## Backup and Restore

Carvey includes backup and restore controls in Settings.

Backups are plain `.zip` files containing:

- `manifest.json`
- a consistent SQLite backup
- uploaded vehicle images and thumbnails

Restore is a two-step flow:

1. Upload a backup to preview its contents.
2. Confirm replacement of the current app data.

Before restore, Carvey creates a rollback snapshot under:

```text
data/restore-rollback/
```

For server-level backups, backing up the entire mounted `/app/data` directory is still recommended.

## Unraid Notes

Carvey is intentionally single-container and stores all persistent state under `/app/data`.

A draft Unraid template is included at:

```text
unraid/Carvey.xml
```

Suggested Unraid mappings:

- Web UI: container port `3000`
- Appdata: `/app/data`
- Timezone: `TZ`
- Optional debug flag: `CARVEY_DEBUG_EASTER_EGGS`

Run behind HTTPS if exposing through a reverse proxy.

## Scripts

```bash
npm run dev      # Start local development server
npm run build    # Build production app
npm run start    # Start production app
npm run lint     # Run ESLint
npm run test     # Run tests
```

## Current Scope

Carvey currently focuses on core vehicle ownership and maintenance tracking.

Included:

- Vehicle garage
- Maintenance logs
- Repair logs
- MOT records
- Reminders
- Photo optimisation
- Backup and restore

Not currently included:

- Fuel tracking
- CSV import/export
- Multi-user permissions
- SSO
- Public API
- Mobile app

## Development Status

Carvey is early-stage software. It is usable for local testing and self-hosted experimentation, but expect rough edges while the data model and UI continue to evolve.
