# TFSA Tracker

A private, password-gated personal finance app for tracking estimated TFSA contribution room. The hosted app is available at [https://tfsa.molinaristudios.com](https://tfsa.molinaristudios.com), where a Cloudflare Worker stores data centrally in Cloudflare D1.

The app does not connect to CRA, banks, brokerages, or external account services. It has one password-gated user and no public accounts or data-sharing features.

## Manual Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your local environment file:

   ```sh
   cp .env.example .env
   ```

   Add your own uncommitted local development values for `TFSA_PASSWORD` and `TFSA_SESSION_SECRET`; this repository intentionally supplies no values for them.

3. Generate Prisma Client, apply migrations, and seed annual TFSA limits:

   ```sh
   npm run db:setup
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## One-time hosted deployment setup

Run these commands once, in this order, after reviewing the Cloudflare configuration. They are instructions only; do not run them from GitHub Actions or copy secrets into this repository.

```sh
npx wrangler login
npx wrangler d1 create tfsa-tracker
npm run cf:types
npm run d1:migrate:remote
npx wrangler secret put TFSA_PASSWORD
npx wrangler secret put TFSA_SESSION_SECRET
npm run deploy
```

Copy the real `database_id` from the one-time `wrangler d1 create tfsa-tracker` output into the existing `database_id` field in `wrangler.jsonc`. Do not replace it with a guessed value.

For GitHub deployment automation, create a Cloudflare API token limited to **Workers Scripts Edit**, **Workers Routes Edit**, and **D1 Edit**, then add only `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets. `TFSA_PASSWORD` and `TFSA_SESSION_SECRET` are Worker session secrets: set them directly in Cloudflare with the commands above and never add them to GitHub, actions workflows, committed environment files, or documentation as values.

GitHub Pages is not an acceptable deployment target: it cannot provide the Worker, D1 database, or password gate. Do not upload `prisma/dev.db`; it is a local development database, not a hosted migration path.

## First migration to hosted storage

1. Run the updated local app and download its JSON backup.
2. Sign in at [https://tfsa.molinaristudios.com](https://tfsa.molinaristudios.com).
3. Open **Settings**.
4. Import the JSON backup there to copy the local data into the hosted D1-backed app.

## Setup With Codex

You can ask Codex to handle the setup steps for you:

```text
Set up this repo on my Mac: install dependencies, create .env from .env.example, run npm run db:setup, and tell me how to start the dev server.
```

## Transaction Types

The app separates estimated TFSA contribution room from estimated account balance.

Only contributions and withdrawals affect estimated contribution room. Transfers, fees, income, market changes, and balance snapshots are ignored by the contribution-room calculator.

| Type | Use it for | Contribution room effect | Balance effect |
| --- | --- | --- | --- |
| `CONTRIBUTION` | Money you add to a TFSA from outside your TFSA accounts. | Reduces room in the transaction year. | Increases balance. |
| `WITHDRAWAL` | Money you remove from a TFSA to a non-TFSA account. | Restores room on January 1 of the following year. | Decreases balance. |
| `QUALIFYING_TRANSFER` | Direct TFSA-to-TFSA transfers between institutions. | No effect. | No effect. |
| `FEE` | Account, trading, or administrative fees paid from inside the TFSA. | No effect. | Decreases balance. |
| `DIVIDEND` | Dividend income earned inside the TFSA. | No effect. | Increases balance. |
| `INTEREST` | Interest earned inside the TFSA. | No effect. | Increases balance. |
| `MARKET_ADJUSTMENT` | Investment gains or losses that are not deposits, withdrawals, income, or fees. | No effect. | Adjusts balance up or down. |
| `BALANCE_SNAPSHOT` | A known account balance on a specific date. | No effect. | Resets that account's estimated balance to the snapshot amount. |

All money is stored as integer cents. Contribution room shown in the app is always an estimate.

## Troubleshooting

For detailed setup notes and fixes for missing `.env`, missing SQLite database, missing `AnnualLimit` table, or duplicate `dev.db` files, see [SETUP.md](./SETUP.md).
