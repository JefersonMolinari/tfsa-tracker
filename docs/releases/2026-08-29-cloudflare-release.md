# Cloudflare release — 2026-08-29

- Live URL: `https://tfsa.molinaristudios.com`
- Runtime: Cloudflare Worker with a Cloudflare D1 database.
- Immutable Worker version: `70bfb7e4-d8c5-4139-907a-b16cc57dacba` (deployed at `2026-08-29T06:50:38.143685Z`).
- Verification timestamp: `2026-08-29T14:09:31Z`.
- Database migrations applied: `0001_initial.sql` and `0002_seed_annual_limits.sql`.
- Anonymous access checks: the app root and both export endpoints redirect to `/login` without returning private data.
- Authenticated release checks: account and transaction creation, reload persistence, and cleanup all passed. The temporary verification records were removed.
- Local-data migration check: the repository's local TFSA database contained no accounts, transactions, or user settings. The 18 seeded annual-limit reference rows are present in D1, so there was no personal local data to import.

The release checklist confirmed that public DNS resolves both IPv4 and IPv6 Cloudflare proxy addresses for `tfsa.molinaristudios.com`, and an anonymous HTTPS request reaches Cloudflare and redirects to `/login`. The Worker route is backed by a proxied `A` placeholder (`192.0.2.0`) and a proxied `AAAA` placeholder (`100::`); neither placeholder is an application origin.
