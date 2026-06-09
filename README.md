<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/icons/Carvey-plate-front.png">
    <img src="public/icons/Carvey-plate-rear.png" alt="Carvey Logo" width="360">
  </picture>
</p>

Carvey is a self-hosted, local-first car maintenance tracker for managing vehicles, repairs, maintenance, MOTs, reminders and running costs. Your "digital service history" for your older cars, or your digital backup of all that paperwork you've got stuffed in a slippery fish.

## Screenshots

![Carvey App](screenshot/Screenshot_20260506_183228.png)

## What It Does

- Tracks multiple vehicles in one garage
- Stores vehicle details, odometer readings, and notes
- Logs maintenance, repairs, MOTs/emissions tests, and reminders
- Attaches receipts and documents (PDF, images) to any record
- Shows a dashboard with costs, reminders, and upcoming tests
- Configurable regional settings for currency, distance, dates, and more
- Backup & restore your config / data

## Regional Settings

Carvey is configurable for different regions under **Settings → Regional**. All options default to UK values.

| Setting | Options |
|---|---|
| Currency | GBP (£) · USD ($) |
| Distance unit | Miles · Kilometres (km) |
| Date format | DD Mon YYYY · ISO 8601 (YYYY-MM-DD) |
| Vehicle identifier | Registration · Plate Number |
| Annual vehicle test | MOT · Emissions Test · Disabled |

## How It Works

- Built as a Next.js app with a server-rendered UI
- Stores data in SQLite under `/app/data`
- Saves uploaded vehicle images and file attachments alongside the database
- Packages the database and uploads together for backup and restore
- Authentication can be disabled for deployments behind a trusted reverse proxy

## Quick Start

Local development:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

On first run, create your admin account in the setup screen.

Example local env:

```bash
CARVEY_DATA_DIR=./data
TZ=Europe/London
```

Docker Compose:

```bash
docker compose up -d --build
```

Then open `http://localhost:3000`.

## Tech Stack

- Next.js
- React
- TypeScript
- SQLite via `better-sqlite3`
- Sharp for image processing
- Vitest for tests
