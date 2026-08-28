# Cloudflare-hosted TFSA Tracker — Design

**Date:** 2026-08-27  
**Status:** Approved for implementation planning

## Goal

Move the single-user TFSA Tracker from a local-only Next.js and SQLite application to a private, centrally stored application at `https://tfsa.molinaristudios.com`.

The hosted application must retain the current dashboard, account, transaction, settings, CSV import/export, and TFSA contribution-room calculation behavior. Contribution room remains explicitly labelled as an estimate and all monetary values remain integer cents.

## Decisions

- Cloudflare Workers is the only production host. GitHub remains the source repository and deployment trigger; GitHub Pages is not used.
- `tfsa.molinaristudios.com` is the production address.
- Cloudflare D1 is the central SQLite-compatible database.
- The application is private to one user. A password is required before any page, route, server action, or data operation is available.
- Existing local data is moved using an authenticated, versioned full-backup export/import flow. No database file or credential is uploaded to source control.
- The user's request for central storage and a login overrides the repository's earlier local-only/no-login/no-cloud-database product direction. The repository documentation will be updated to reflect the new direction.

## Architecture

One Cloudflare Worker hosts the existing Next.js application and its static assets, server-rendered pages, server actions, and route handlers. The Worker is reached directly through the custom domain; there is no separate frontend host, public API origin, or browser-held database credential.

The existing application structure remains intact:

- App Router pages render the dashboard, accounts, transactions, and settings views.
- Server actions continue to perform account, transaction, CSV-import, and settings writes.
- The transaction-export route remains a server-side route.
- TFSA calculation utilities remain pure TypeScript functions and remain independent of persistence and React components.

The implementation will first run Cloudflare's Next.js compatibility check. The default deployment adapter is Cloudflare's currently recommended Next.js-on-Workers path. If that check identifies an incompatibility with this application's server actions or dependencies, the deployment will use Cloudflare's documented OpenNext adapter instead; the application behavior and public interface do not change.

## Persistence and D1

The Prisma schema continues to define `Account`, `Transaction`, `AnnualLimit`, and `UserSettings`. Local development continues to use the existing `better-sqlite3` adapter and `prisma/dev.db`.

Production changes only the database adapter and its source:

- Wrangler binds the production D1 database to the Worker as `DB`.
- Production creates Prisma Client with the Cloudflare D1 adapter and the `DB` binding.
- Development creates Prisma Client with the existing local SQLite adapter.
- Database access is isolated behind server-only database helpers, so pages and business logic do not need to know which adapter is active.

The production D1 migration creates the existing schema. A separate, idempotent seed step loads the repository's annual TFSA limits. It must never overwrite user settings, accounts, or transactions.

## Authentication and authorization

The application has a single password login screen and logout action.

- `TFSA_PASSWORD` and `TFSA_SESSION_SECRET` are Cloudflare Worker secrets, never source files, browser code, or Git history.
- A successful login issues an HttpOnly, Secure, SameSite=Lax signed session cookie with a short, fixed expiry.
- Password comparison and session signing use Workers-compatible Web Crypto APIs. The password is not persisted in D1.
- Middleware or an equivalent shared server guard redirects unauthenticated page requests to the login screen.
- Every server action and route handler also calls the shared guard before reading or writing data. This prevents direct requests from bypassing the page-level guard.
- Session expiry returns the user to login without exposing data. Logout clears the session cookie.

## Existing-data migration

The existing transaction CSV exchange is retained. A separate full-backup format is added for the migration because the CSV does not cover every setting needed to restore the application. Both import paths use a D1-native import helper rather than Prisma transactions: Prisma's D1 adapter does not provide transactional guarantees.

### Backup format

The export contains a version marker plus:

- the single `UserSettings` record;
- all accounts, preserving IDs, names, institutions, notes, and timestamps;
- all transactions, preserving IDs, account relationships, type, cents, dates, notes, and timestamps.

Annual limits are not user data and are restored by the D1 seed rather than by the backup.

### Export and import behavior

- The local app offers an authenticated download of the JSON backup.
- The hosted app offers the protected import control after deployment.
- Import validates the complete JSON structure and schema version before any database write.
- A backup is limited to 5 MiB, 2,000 accounts, and 10,000 transactions. Larger backups are rejected before any database statement is prepared; the initial single-user migration is therefore guaranteed to fit in one D1 batch.
- The Worker-only D1 import helper builds parameterized `INSERT ... ON CONFLICT DO UPDATE` statements in dependency order (settings, accounts, then transactions) and sends the full list through one `DB.batch()` call. D1 guarantees that a failed statement aborts and rolls back the complete batch.
- The existing CSV import uses the same helper and one `DB.batch()` call. It does not call Prisma's `$transaction` in production.
- Account and transaction records are upserted by their existing IDs; settings are upserted by ID. Re-importing the same backup is therefore safe and does not duplicate data.
- An invalid file, limit breach, or failed D1 batch leaves the existing D1 data unchanged.
- The user exports their backup locally before their first hosted import. The old local database remains untouched as a fallback copy.

## Deployment

The repository gains Wrangler configuration, a D1 binding, a custom-domain route, and production build/deploy scripts. Cloudflare hosts both the Worker code and application assets.

A GitHub Actions workflow runs on pushes to `main`:

1. install locked dependencies;
2. generate the Prisma client and run checks/tests;
3. apply the reviewed D1 migration and seed annual limits;
4. deploy the Worker and its assets;
5. make the current Worker version available at `tfsa.molinaristudios.com`.

The workflow uses Cloudflare credentials stored as GitHub repository secrets. The password and session secret remain Cloudflare Worker secrets and are never passed through the build or committed. Database migrations are additive and non-destructive; a failed migration or failed validation halts deployment.

## Failure handling

- Invalid login shows a generic credential error and does not reveal whether any account or data exists.
- Expired or missing sessions redirect to login.
- Validation failures retain submitted form values and show actionable field errors.
- Data read or write failures produce a clear retry message without falsely reporting success.
- Import failures identify malformed or unsupported backups without partially importing records; the UI reports success only after the D1 batch completes.
- A failed deployment leaves the last successfully deployed Worker version serving production traffic.

## Tests and acceptance checks

Existing unit and component tests continue to run. New coverage will verify:

- production database helper creation uses a D1 binding, while development retains local SQLite;
- protected pages, server actions, export routes, and import routes reject unauthenticated access;
- successful login, session expiry, and logout behavior;
- existing account, transaction, settings, CSV import/export, and TFSA calculation behavior against D1;
- full-backup and CSV validation, complete restore, bounded-input rejection, failed-D1-batch rollback, and idempotent retry;
- an injected failing statement in a local Worker/D1 batch and verification that no account, transaction, or setting was changed;
- the D1 migration and annual-limit seed against a local Worker/D1 test environment;
- a production smoke test at `https://tfsa.molinaristudios.com` covering login, dashboard load, one write, and a read-back.

## Out of scope

- Multi-user accounts, external identity providers, password reset, or shared access.
- Bank, brokerage, CRA, payment, tax-filing, or investment-advice integrations.
- Automatic discovery or upload of a local SQLite file.
- Automatic import of arbitrary database files or unversioned backup data.
