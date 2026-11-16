# Carvey audit — November 2026

An audit, bug hunt and improvement pass over Carvey 1.0.9 + unreleased (`main` at `94b8875`), plus options for a mobile companion app.

| Document | What's in it |
|---|---|
| [AUDIT.md](AUDIT.md) | Architecture overview and every finding, ranked by severity, with file, line, impact and fix |
| [BUG-LOG.md](BUG-LOG.md) | Test-suite results and every bug found, with steps to reproduce, expected vs actual, severity and status |
| [CHANGES.md](CHANGES.md) | The code changes on this branch, one commit per fix, each with a short explanation |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | Proposed (not yet implemented) Medium/Low fixes and quality-of-life features, with effort estimates |
| [RUNBOOK.md](RUNBOOK.md) | Step-by-step instructions for applying this to your live deployment, with rollback for each step |
| [MOBILE.md](MOBILE.md) | Mobile companion app options compared, backend API changes needed, recommendation, MVP and build plan |

## Assumptions

The brief's context section was left as a template, so I worked these out from the repository. Correct me if any are wrong.

- **App:** Carvey, a self-hosted car maintenance tracker (service history, MOTs, renewals, reminders, costs, receipts).
- **Stack:** Next.js 16.4 (App Router, server actions, standalone output) · React 19 · TypeScript · SQLite via `better-sqlite3` · `sharp` for images · Vitest.
- **Deployment:** the published image `ghcr.io/revise0592/carvey` on Docker / Docker Compose or the Unraid template, one container, data in a `/app/data` volume, behind a reverse proxy (Traefik via Pangolin is assumed for the runbook and the mobile section).
- **Users:** one admin (the schema supports exactly one account), with access from home and away.
- **Known issues:** none were listed, so the bug log is everything I found myself.

## Ground rules followed

- Nothing ran against a live instance. All testing used a throwaway local production build on `127.0.0.1:3123` with a scratch data directory.
- Anything that touches the live deployment is in [RUNBOOK.md](RUNBOOK.md), not done.
- No large rewrites: each fix is a small commit on `claude/gracious-shannon-9awbyt`. Nothing is merged or released.

## Headline results

- **Test suite:** 121/121 passing before; **137/137** after (16 new regression tests). Typecheck clean, lint 0 errors.
- **Findings:** 0 Critical · 3 High · 12 Medium · 15 Low.
- **Fixed on this branch:** all 3 High, plus 6 Medium and 4 Low that were small and well contained.
- **Biggest risks fixed:** a login rate-limit bypass, a restore that could hand the instance to whoever loaded `/setup` next, a vehicle page that a bad date could break permanently, and a recovery command that could not work in the published image.
- **Mobile recommendation:** improve the existing PWA first (it already installs), then wrap it with Capacitor only if you want App Store distribution or richer native features. A native app is not worth the cost for a single-user tool.
