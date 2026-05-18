# Setup

This is a private, local-only TFSA tracker. It uses SQLite through Prisma, with the development database stored at `prisma/dev.db`.

## New Mac Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

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
