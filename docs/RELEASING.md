# Releasing Carvey

Maintainer notes. Users don't need any of this: they pull `ghcr.io/revise0592/carvey`.

## How versions work

- **The Git tag is the source of truth.** Publishing a release tagged `V1.8.0` builds an image that reports `1.8.0` in **Settings → Backup & Restore** and in every backup file. The workflow passes the version in as `CARVEY_VERSION`, with the commit as `CARVEY_COMMIT`, shown as `1.8.0 (abc1234)`.
- **Tag style:** `V1.8.0` (capital V, as since V1.5.0). The workflow also accepts `v1.8.0`. It strips the prefix for image tags.
- **`package.json`** is used for builds without a tag (local, source, PR builds). Keep it in step. If you forget, the release still reports the right version and the workflow shows a warning on the run.
- **Numbering:** bump the minor version (1.7 → 1.8) for new features, and the patch version (1.8.0 → 1.8.1) for fix-only releases.

## Checklist

### 1. Before the release

1. Make sure everything for the release is merged to `main` and the latest **Build and publish image** run on `main` (or the last PR) is green.
2. In one small PR:
   - Bump the version without creating a tag:
     ```bash
     npm version 1.8.0 --no-git-tag-version
     ```
   - In `CHANGELOG.md`, rename `## [Unreleased]` to `## [1.8.0] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` above it.
3. Merge it. The PR run is your last check: typecheck, lint, tests, `npm audit` and a trial image build.

### 2. Publish

1. GitHub → **Releases** → **Draft a new release**.
2. **Choose a tag:** type `V1.8.0` → *Create new tag on publish*, target **main**.
3. **Title:** `V1.8.0` (optionally with a short headline, e.g. "V1.8.0: …").
4. **Notes:** start from the version's `CHANGELOG.md` section (template below).
5. Tick **Set as a pre-release** only for test builds. Pre-releases get only their version tag (`:1.8.0`), never `:latest`.
6. **Publish release.**

### 3. What happens next (automatic)

The **Build and publish image** workflow:

1. runs the **test** job: `npm ci`, typecheck, lint, tests, and `npm audit --omit=dev --audit-level=high`. Nothing is published if it fails.
2. builds the image with `CARVEY_VERSION=1.8.0` and `CARVEY_COMMIT=<sha>` baked in.
3. pushes `ghcr.io/revise0592/carvey:1.8.0`, plus `:latest` for a full release.

### 4. Check it

1. **Actions** tab: the run is green, with no "package.json version" warning (if there is one, bump `package.json` in the next commit).
2. GitHub → **Packages → carvey**: `1.8.0` and `latest` point to the new image.
3. On a test instance or your own:
   ```bash
   docker compose pull && docker compose up -d
   ```
   **Settings → Backup & Restore** shows `1.8.0 (<sha>)` and `/api/health` returns `{"ok":true,…}`.
4. Unraid users get the update through *Check for Updates* (the template tracks `:latest`).

## Fixing a release

- **Rebuild the same version** (e.g. after a CI hiccup): **Actions → Build and publish image → Run workflow**, *Use workflow from:* **Tags → V1.8.0**. It rebuilds and re-pushes `:1.8.0` and `:latest`.
- **Roll `:latest` back** to the previous version: run the workflow the same way on the previous tag (e.g. `V1.7.0`). A manual run on a tag always moves `:latest` to it. Then fix forward with `V1.8.1`.
- **Never re-use or move a published tag.** People pin version tags; publish a new patch version instead.

## Release notes template

```markdown
## Carvey 1.8.0: <short headline>

<One or two sentences: what this release is about and who should update.>

### ✨ New
- **Feature.** What it does for the user, where to find it.

### ⚡ Improved
- …

### 🔒 Security
- …

### 🐛 Fixed
- **Most serious first.** What went wrong, from the user's point of view.

The full list is in [CHANGELOG.md](https://github.com/Revise0592/Carvey/blob/main/CHANGELOG.md).

### ⬆️ Upgrading

Take a backup first (**Settings → Backup & Restore → Download backup**), then:

    docker compose pull && docker compose up -d

**Worth knowing:** <new defaults, new environment variables, anything users must check or change>.
```
