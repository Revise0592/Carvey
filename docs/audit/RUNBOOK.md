# Live deployment runbook

Everything here touches your live instance, so it's for you to run. Steps are independent unless noted; do step 0 first, then pick what you want. Each step has a check and a rollback.

**Assumptions.** Container name `carvey`, Compose file in `~/carvey/` with data bind-mounted at `./data` → `/app/data` (Unraid: `/mnt/user/appdata/carvey/`). Traefik behind Pangolin in front. Adjust paths to match yours. Commands run on the Docker host.

**Schema.** None of the code changes alter the database schema or need a migration, so rolling back the image never needs a data restore. Step 0 is a safety net, not a requirement of the upgrade.

---

## Step 0 — Take a consistent backup and note what's running

```bash
cd ~/carvey
```

```bash
docker inspect --format '{{index .RepoDigests 0}}' "$(docker inspect --format '{{.Image}}' carvey)" | tee pre-upgrade-image.txt
```

```bash
docker compose stop carvey
```

```bash
sudo tar -C ~/carvey -czf ~/carvey-data-$(date +%F).tar.gz data
```

```bash
docker compose start carvey
```

**Check:** `ls -lh ~/carvey-data-*.tar.gz` shows a file roughly the size of your data folder; `pre-upgrade-image.txt` holds a `ghcr.io/revise0592/carvey@sha256:…` line.
**Rollback:** nothing to undo. Downtime is the few seconds the container is stopped.

Also download a backup from **Settings → Backup** in the browser, as a second copy in Carvey's own format.

---

## Step 1 — Get an image that contains the fixes

The fixes are on branch `claude/gracious-shannon-9awbyt`, not released. Pick one:

**1a. Release it (recommended).** Open a PR from the branch, review, merge, then publish a GitHub release (e.g. `v1.1.0`). The existing workflow builds and pushes `ghcr.io/revise0592/carvey:1.1.0` and `:latest`.

**1b. Build it yourself on the host, without touching the registry:**

```bash
git clone --branch claude/gracious-shannon-9awbyt https://github.com/Revise0592/Carvey.git ~/carvey-src
```

```bash
docker build -t carvey:audit ~/carvey-src
```

**Check:** `docker image ls carvey` (1b) or the package page on GitHub (1a) shows the new tag.
**Rollback:** nothing deployed yet.

---

## Step 2 — Deploy the new image (pinned)

Edit `docker-compose.yml` so the service uses a fixed tag and doesn't try to build:

```yaml
services:
  carvey:
    image: ghcr.io/revise0592/carvey:1.1.0   # or carvey:audit if you built it in 1b
    # build: .   ← remove this line in your deployment copy
```

```bash
docker compose pull carvey
```

(Skip the pull if you used 1b.)

```bash
docker compose up -d carvey
```

**Check, in order:**

```bash
docker compose ps carvey
```
→ `healthy` within ~30 s.

```bash
docker logs --since 5m carvey
```
→ no stack traces.

```bash
docker exec carvey ls scripts/reset-password.mjs node_modules/bcryptjs/package.json
```
→ both listed (this is the recovery-script fix).

Then in the browser: sign in (with 2FA if on), open the garage, open each vehicle once, open Reminders and Costs, and download a backup.

**Rollback:** set `image:` back to the digest in `pre-upgrade-image.txt` and run the next command. No data restore is needed.

```bash
docker compose up -d carvey
```

---

## Step 3 — Look for bad dates already in the database (read-only)

Before the fix, a date like `next tuesday` could be saved through a browser without a date picker. Pages now display such values instead of crashing, but you may want to correct them. This opens the database **read-only** and lists any stored date that isn't a real `YYYY-MM-DD` day:

```bash
docker exec carvey node -e '
const db = require("better-sqlite3")("/app/data/carvey.sqlite", { readonly: true });
const checks = [["vehicles","purchase_date"],["maintenance_records","date"],["repair_records","date"],["mot_records","test_date"],["mot_records","expiry_date"],["reminders","due_date"],["planned_purchases","due_date"],["planned_purchases","purchased_date"],["fuel_records","date"],["renewals","start_date"],["renewals","end_date"]];
for (const [t, c] of checks) {
  const rows = db.prepare(`SELECT id, ${c} AS value FROM ${t} WHERE ${c} IS NOT NULL AND (date(substr(${c}, 1, 10)) IS NULL OR date(substr(${c}, 1, 10)) != substr(${c}, 1, 10))`).all();
  for (const r of rows) console.log(t, c, r);
}
console.log("done");'
```

(Tested against a copy holding `next tuesday`: it prints `vehicles purchase_date { id: 1, value: 'next tuesday' }`. `2026-02-31` is caught too, because SQLite normalises it to `2026-03-03`, which no longer matches.)

**Check:** prints `done`, ideally with nothing before it. Fix any listed rows by editing them in the UI.
**Rollback:** nothing changed.

---

## Step 4 — Harden the container

Replace the service definition in your deployment `docker-compose.yml` with:

```yaml
services:
  carvey:
    image: ghcr.io/revise0592/carvey:1.1.0
    container_name: carvey
    ports:
      - "127.0.0.1:3000:3000"        # only the host itself; Traefik/Newt reach it locally
    environment:
      TZ: Europe/London
      CARVEY_DATA_DIR: /app/data
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    init: true                       # reaps child processes, forwards signals
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    mem_limit: 768m
    pids_limit: 200
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

**Port binding.** If Traefik runs in Docker on the same host, the cleaner option is to remove `ports:` and put Carvey on Traefik's network (`networks: [proxy]` plus `networks: { proxy: { external: true } }`), pointing Traefik at `http://carvey:3000`. If Newt/Pangolin connects to the host's LAN IP rather than `127.0.0.1`, bind to that IP instead. **Check which one your Pangolin resource targets before changing this**, or you'll cut off remote access.

```bash
docker compose up -d carvey
```

**Check:** healthy in `docker compose ps`; site loads through your public URL; from another LAN machine, `curl -m 3 http://<host-ip>:3000/api/health` now **fails** (unless you deliberately bound the LAN IP); upload a photo and download a backup (exercises disk writes and memory).

**Optional, test separately:** `read_only: true` with `tmpfs: ["/tmp"]`. The app only writes to `/app/data`, but I couldn't run Docker in the audit environment to prove Next never writes under `/app/.next`. If logs show `EROFS`, remove it.

**Rollback:** restore the previous compose file and run `docker compose up -d carvey`.

**Unraid:** set the Web UI port mapping's host IP in the template, and add `--security-opt=no-new-privileges:true --cap-drop=ALL --memory=768m` to **Extra Parameters**. Change the repository from `:latest` to a version tag.

---

## Step 5 — Reverse proxy settings (Traefik / Pangolin)

**5a. Make the proxy overwrite client-IP headers** (so login throttling sees the real client). Traefik already sets `X-Forwarded-For` itself; make sure it doesn't trust values sent by the client: on the entrypoint, do **not** set `forwardedHeaders.insecure: true`, and only list Pangolin/Newt's address in `forwardedHeaders.trustedIPs`.

**5b. HSTS and a login rate limit at the edge** (defence in depth on top of the app's throttle). In Traefik's dynamic configuration (the file provider Pangolin uses for custom middlewares):

```yaml
http:
  middlewares:
    carvey-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
    carvey-login-ratelimit:
      rateLimit:
        average: 10
        period: 1m
        burst: 10
```

Attach `carvey-headers` to the Carvey router, and `carvey-login-ratelimit` to a second router for the same host with `PathPrefix(`/login`)` and a higher priority.

**5c. Optional: proxy mode with Pangolin SSO.** If Pangolin's SSO already protects the resource, you can let it vouch for you instead of a second password prompt: set `CARVEY_AUTH_MODE=proxy` and a 32-byte `CARVEY_PROXY_SECRET`, and have Traefik add the header (`customRequestHeaders: { X-Carvey-Proxy-Secret: "<secret>" }`). Keep step 4's port binding so nobody can reach the container without going through the proxy. **Note for the mobile app:** SSO in front of Carvey makes native/wrapped apps harder (see [MOBILE.md](MOBILE.md) §4).

**Check:** `curl -sI https://<your-carvey-host>/login | grep -i strict-transport` shows the header; 15 rapid `curl` requests to `/login` start returning `429`; normal browsing is unaffected.
**Rollback:** remove the middlewares from the router (Traefik reloads dynamic config without a restart). For 5c, remove the two environment variables and run `docker compose up -d carvey`.

---

## Step 6 — Automatic off-box backups

Carvey's backups are manual today. Until a built-in schedule exists ([IMPROVEMENTS.md](IMPROVEMENTS.md) #2), take a consistent DB copy and let restic carry it off the box.

**6a. Consistent DB snapshot inside the volume** (SQLite's online backup API, safe while running):

```bash
docker exec carvey node -e 'require("better-sqlite3")("/app/data/carvey.sqlite",{readonly:true}).backup("/app/data/tmp/carvey-snapshot.sqlite").then(()=>console.log("ok"))'
```

**6b. Back up the folder with restic**, excluding the live DB files (the snapshot replaces them) and scratch folders:

```bash
restic backup ~/carvey/data --exclude 'carvey.sqlite' --exclude 'carvey.sqlite-*' --exclude 'restore-staging' --tag carvey
```

**6c. Schedule both** in the host's crontab (`crontab -e`), e.g. nightly at 03:17:

```
17 3 * * * docker exec carvey node -e 'require("better-sqlite3")("/app/data/carvey.sqlite",{readonly:true}).backup("/app/data/tmp/carvey-snapshot.sqlite").then(()=>console.log("ok"))' && restic backup /home/<you>/carvey/data --exclude 'carvey.sqlite' --exclude 'carvey.sqlite-*' --exclude 'restore-staging' --tag carvey --quiet
```

(restic needs its repository and password environment available to cron, as in your other restic jobs.)

**Check:** `restic snapshots --tag carvey` lists a snapshot; `restic ls latest --tag carvey | grep carvey-snapshot.sqlite` finds the file. Test a restore once: `restic restore latest --tag carvey --target /tmp/carvey-restore-test`, then open the snapshot with `sqlite3` and `SELECT count(*) FROM vehicles;`.
**Rollback:** remove the cron line. The snapshot file is harmless to leave.

**To restore from it:** stop the container, copy `tmp/carvey-snapshot.sqlite` to `data/carvey.sqlite` (and delete `carvey.sqlite-wal`/`-shm`), restore `uploads/`, start the container.

---

## Step 7 — Reclaim space from old restores (optional)

Every restore keeps a full copy of the previous DB and uploads in `data/restore-rollback/<timestamp>/`, and abandoned previews stay in `data/restore-staging/`. Look first:

```bash
sudo du -sh ~/carvey/data/restore-rollback/* ~/carvey/data/restore-staging/* 2>/dev/null
```

Once Step 0's archive exists and you're happy with the current data, delete the specific old folders you no longer need, by full path, one at a time:

```bash
sudo rm -r ~/carvey/data/restore-rollback/2026-01-02T10-00-00-000Z
```

**Check:** the app still loads; `du -sh ~/carvey/data` shrank.
**Rollback:** extract the folder from Step 0's archive: `sudo tar -C ~/carvey -xzf ~/carvey-data-<date>.tar.gz data/restore-rollback/<folder>`.

---

## If something goes wrong

| Symptom | Action |
|---|---|
| Container unhealthy after step 2 | `docker logs carvey`; roll back to the digest in `pre-upgrade-image.txt` |
| Locked out | `docker exec -it carvey node scripts/reset-password.mjs` (works from the new image on), or set `CARVEY_RESET_PASSWORD` and restart |
| Remote access gone after step 4 | Your Pangolin/Newt target isn't `127.0.0.1`; change the port binding to the address it uses, or revert step 4 |
| Data looks wrong | Stop the container, restore `data/` from step 0's archive, start it |
