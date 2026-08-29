# Cloudflare release — 2026-08-29

- Live URL: `https://tfsa.molinaristudios.com`
- Runtime: Cloudflare Worker with a Cloudflare D1 database.
- Database migrations applied: `0001_initial.sql` and `0002_seed_annual_limits.sql`.
- Anonymous access checks: the app root and both export endpoints redirect to `/login` without returning private data.
- Authenticated release checks: account and transaction creation, reload persistence, and cleanup all passed. The temporary verification records were removed.
- Local-data migration check: the repository's local TFSA database contained no accounts, transactions, or user settings. The 18 seeded annual-limit reference rows are present in D1, so there was no personal local data to import.

The Worker route is served through proxied IPv4 and IPv6 placeholder DNS records for `tfsa.molinaristudios.com`.
