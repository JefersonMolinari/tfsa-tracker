# Setup

This is a private, password-gated TFSA tracker for one person. Its hosted data is stored centrally behind a Cloudflare Worker in Cloudflare D1 at [https://tfsa.molinaristudios.com](https://tfsa.molinaristudios.com). The SQLite database at `prisma/dev.db` remains a local development database only.

## One-time Cloudflare setup

Run these commands exactly once and in this order. These are manual setup instructions, not commands to run from GitHub Actions.

1. `npx wrangler login`
2. `npx wrangler d1 create tfsa-tracker`
3. **Before continuing**, copy the real `database_id` printed by the D1-create command into the existing `database_id` field in `wrangler.jsonc`. Do not leave the placeholder in place or continue to `npm run cf:types` until this is complete.
4. `npm run cf:types`
5. `npm run d1:migrate:remote`
6. `npx wrangler secret put TFSA_PASSWORD`
7. `npx wrangler secret put TFSA_SESSION_SECRET`
8. In Cloudflare DNS, create or confirm both records for `tfsa.molinaristudios.com`:
   - a proxied `A` record with the originless placeholder `192.0.2.0`;
   - a proxied `AAAA` record with the originless placeholder `100::`.
9. Confirm public IPv4 and IPv6 resolution before deployment:

   ```sh
   dig +short A tfsa.molinaristudios.com
   dig +short AAAA tfsa.molinaristudios.com
   ```

   Both commands must return Cloudflare proxy addresses. A Worker route on a hostname without a proxied DNS record does not resolve, and checking both families prevents an IPv4-only or IPv6 client from being left behind.
10. `npm run deploy`

After deployment, repeat both `dig` commands, run `curl -I https://tfsa.molinaristudios.com`, and confirm that an anonymous request reaches Cloudflare and redirects to `/login`. Record the immutable Worker version from `npx wrangler deployments list --name tfsa-tracker` together with the UTC verification timestamp in the release notes.

Create a GitHub repository deployment token with only **Workers Scripts Edit**, **Workers Routes Edit**, and **D1 Edit**. Store that token as `CLOUDFLARE_API_TOKEN` and the account identifier as `CLOUDFLARE_ACCOUNT_ID` in GitHub repository secrets. These are deployment credentials, separate from `TFSA_PASSWORD` and `TFSA_SESSION_SECRET`, which must be set as Worker session secrets in Cloudflare and must never be placed in GitHub, action workflows, committed environment files, or documentation as values.

Do not use GitHub Pages for this app: it cannot run the Worker, provide password gating, or access D1. Do not upload `prisma/dev.db`; migrate data through a JSON backup import instead.

## First hosted import

CSV and full-backup imports are each limited to 5 MiB, 2,000 unique accounts, and 10,000 transactions. Split larger migrations before importing them.

1. Run the updated local app and download a JSON backup.
2. Sign in at [https://tfsa.molinaristudios.com](https://tfsa.molinaristudios.com).
3. Go to **Settings**.
4. Import the JSON backup to move the local data into hosted storage.

## New Mac Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

   Add your own uncommitted local development values for `TFSA_PASSWORD` and `TFSA_SESSION_SECRET`; this repository intentionally supplies no values for them.

3. Generate Prisma Client, run migrations, and seed TFSA annual limits:

   ```sh
   npm run db:setup
   ```

4. Start the app:

   ```sh
   npm run dev
   ```

## Database Scripts

- `npm run db:generate` regenerates Prisma Client.
- `npm run db:migrate` applies local Prisma migrations.
- `npm run db:seed` loads TFSA annual limits into the database.
- `npm run db:setup` runs generate, migrate, and seed in order.
- `npm run db:reset` resets the local SQLite database, reapplies migrations, and runs the seed command.

## Troubleshooting

### Missing `.env`

If Prisma or the app cannot find `DATABASE_URL`, create `.env` from the example:

```sh
cp .env.example .env
```

The expected value is:

```sh
DATABASE_URL="file:./prisma/dev.db"
```

### Missing SQLite Database

If `prisma/dev.db` does not exist yet, run:

```sh
npm run db:setup
```

This creates the SQLite database by applying the checked-in migrations, then seeds TFSA annual limits.

### Missing `AnnualLimit` Table

If you see an error about a missing `AnnualLimit` table, the database exists but migrations have not been applied. Run:

```sh
npm run db:migrate
npm run db:seed
```

If the local database is disposable, you can also run:

```sh
npm run db:reset
```

### Duplicate `dev.db` Files

The app expects the local database at `prisma/dev.db`. If you accidentally create both `dev.db` and `prisma/dev.db`, keep `prisma/dev.db` and remove the duplicate root-level `dev.db`.

Check for duplicates with:

```sh
find . -name "dev.db" -not -path "./node_modules/*"
```

Then confirm `.env` points to:

```sh
DATABASE_URL="file:./prisma/dev.db"
```

Never upload this local development database to Cloudflare or another hosting service.
