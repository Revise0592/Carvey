<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/icons/Carvey-plate-front.png">
    <img src="public/icons/Carvey-plate-rear.png" alt="Carvey Logo" width="360">
  </picture>
</p>

Carvey is a self-hosted car maintenance tracker. It keeps the service history, MOTs, reminders, receipts and running costs for every car you own in one place. No accounts, no cloud: one SQLite database and an uploads folder.

## Screenshots

<p align="center">
  <img src="screenshot/desktop-garage-light.png" alt="Garage" width="49%">
  <img src="screenshot/desktop-vehicle-dark.png" alt="Vehicle page (dark mode)" width="49%">
</p>
<p align="center">
  <img src="screenshot/desktop-costs-light.png" alt="Costs" width="98%">
</p>
<p align="center">
  <img src="screenshot/mobile-garage-light.png" alt="Garage on mobile" width="30%">
  <img src="screenshot/mobile-vehicle-dark.png" alt="Vehicle page on mobile (dark mode)" width="30%">
  <img src="screenshot/mobile-reminders-light.png" alt="Reminders on mobile" width="30%">
</p>

## Features

**Garage**
- Any number of vehicles, each with a photo, plate, mileage, purchase details and notes
- Garage overview: spend this year, open reminders, MOTs due soon and items to buy
- Mark vehicles as sold

**Per vehicle**
- **Maintenance** and **Repairs**: date, mileage, cost, category, garage/workshop and notes
- **MOTs**: result, expiry and cost. Logging an MOT resets the MOT reminder
- **Fuel**: fill-ups with volume, cost and odometer
- **Reminders**: by date, mileage or both, with optional repeats
- **Service Plan**: reusable intervals (e.g. oil every 12 months / 6,000 miles) linked to reminders
- **To Buy**: planned parts, which convert into a maintenance or repair entry when bought
- **Gallery** and **attachments**: receipts, invoices and photos (PDF or image) on any record
- Printable full service history

**Across the garage**
- **Reminders** page: MOT expiry and every open reminder, grouped by overdue and upcoming
- **Costs** page: spend by month, type and vehicle, per year or all time
- **Quick add**: log anything for any vehicle from the bottom bar (mobile) or **Add** button (desktop)

**App**
- Installable as a PWA, with mobile tab navigation and bottom-sheet forms
- Light and dark mode, ten colour palettes, rounded or boxy shapes
- One-click backup and restore (database and uploads in one zip, with a preview before restore)
- Optional login, which can be turned off behind a trusted reverse proxy

## Regional settings

**Settings → Regional**. Defaults are UK.

| Setting | Options |
|---|---|
| Currency | Any ISO 4217 currency |
| Distance | Miles · Kilometres |
| Fuel volume | Litres · Gallons |
| Date format | DD Mon YYYY · ISO 8601 |
| Plate colour | Yellow (rear) · White (front) |
| Annual test | MOT · Inspection · Custom name · Disabled |

## Quick start

**Docker Compose**

```bash
docker compose up -d
```

Open `http://localhost:3000` and create your admin account. Data is stored in `./data`.

**Local development** (Node 24+)

```bash
npm install
CARVEY_DATA_DIR=./data npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `CARVEY_DATA_DIR` | Where the database and uploads are stored (`/app/data` in Docker) |
| `TZ` | Time zone, e.g. `Europe/London` |
| `CARVEY_RESET_PASSWORD` | Resets the admin password on startup (see below) |

## Password reset

From inside the container, with no restart:

```bash
docker exec -it <container-name> node scripts/reset-password.mjs
```

Or set `CARVEY_RESET_PASSWORD=newpassword`, restart, log in, then remove the variable and restart again.

## Tech stack

Next.js · React · TypeScript · SQLite (`better-sqlite3`) · Sharp · Vitest

## Issues and feedback

Report bugs in [Issues](https://github.com/Revise0592/Carvey/issues). Send feature requests [here](https://carvey.userjot.com/).
