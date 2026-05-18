# TFSA Tracker

A private, local-only personal finance app for tracking estimated TFSA contribution room.

The app runs on Next.js, stores data locally in SQLite, and uses Prisma for database access. It does not connect to CRA, banks, brokerages, cloud databases, or external account services.

## Manual Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

3. Generate Prisma Client, apply migrations, and seed annual TFSA limits:

   ```sh
   npm run db:setup
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Setup With Codex

You can ask Codex to handle the setup steps for you:

```text
Set up this repo on my Mac: install dependencies, create .env from .env.example, run npm run db:setup, and tell me how to start the dev server.
```

## Troubleshooting

For detailed setup notes and fixes for missing `.env`, missing SQLite database, missing `AnnualLimit` table, or duplicate `dev.db` files, see [SETUP.md](./SETUP.md).
