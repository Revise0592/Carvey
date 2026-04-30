# Carvey

Carvey is a self-hosted car maintenance dashboard for a household garage. It tracks vehicles, maintenance, repairs, MOTs, reminders, money spent, and optimized vehicle photos.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The first run creates a local admin account.

Useful environment variables:

```bash
CARVEY_DATA_DIR=./data
CARVEY_SESSION_SECRET=change-me-to-a-long-random-string
TZ=Europe/London
```

## Docker

```bash
docker compose up -d --build
```

The app listens on container port `3000`. All persistent data lives in `/app/data`, including:

- `carvey.sqlite`
- optimized WebP vehicle photos
- thumbnails

Back up the mounted `/app/data` directory to preserve the full garage.

## Unraid Notes

Carvey is intentionally single-container for Unraid Community Applications compatibility later. A future template should expose:

- Web UI port: `3000`
- Appdata path: `/app/data`
- `TZ`
- `CARVEY_SESSION_SECRET`

For reverse proxy use, keep the app behind HTTPS and set a long random `CARVEY_SESSION_SECRET`. The app is designed for LAN/self-hosted use, but still requires login.

## What V1 Includes

- Garage dashboard
- Vehicle profiles
- Maintenance logs
- Repair logs
- MOT records
- Date and mileage reminders
- Vehicle photo upload, resized to WebP at max 1600px with thumbnails

V1 does not include fuel tracking, CSV import/export, SSO, public APIs, or multi-user permissions.
