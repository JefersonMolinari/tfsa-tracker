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
