# Personal TFSA Tracker

## Purpose

Build a private, local-only TFSA tracker for one person.

The app helps me estimate my available TFSA contribution room across multiple TFSA accounts.

## Product principles

1. Local-first.
2. No login.
3. No cloud database.
4. No bank connections.
5. Manual accuracy over automation.
6. Always label contribution room as estimated.
7. Help prevent over-contributions.

## Screens

### Dashboard

Show:
- Estimated available contribution room
- Contributions this year
- Withdrawals this year
- Total TFSA balance
- Warning if estimated room is below $500
- Red warning if estimated room is below $0

### Accounts

Allow me to:
- Add a TFSA account
- Edit a TFSA account
- Delete a TFSA account

Account fields:
- Name
- Institution
- Notes

### Transactions

Allow me to:
- Add a transaction
- Edit a transaction
- Delete a transaction
- Filter transactions by year, account, and type

Transaction types:
- CONTRIBUTION
- WITHDRAWAL
- QUALIFYING_TRANSFER
- FEE
- DIVIDEND
- INTEREST
- MARKET_ADJUSTMENT
- BALANCE_SNAPSHOT

### Settings

Allow me to enter:
- Starting year
- Starting contribution room as of January 1 of that year
- Notes about where I verified the number

## TFSA calculation rules

- Contribution room is shared across all TFSA accounts.
- Contributions reduce room in the same year.
- Withdrawals do not restore room until January 1 of the next calendar year.
- Qualifying transfers between TFSAs do not affect room.
- Investment gains do not increase room.
- Investment losses do not decrease room.
- Fees do not affect room.
- Dividends and interest do not affect contribution room.
- Always show the result as an estimate.

## TFSA annual limits

Use this table:

- 2009: $5,000
- 2010: $5,000
- 2011: $5,000
- 2012: $5,000
- 2013: $5,500
- 2014: $5,500
- 2015: $10,000
- 2016: $5,500
- 2017: $5,500
- 2018: $5,500
- 2019: $6,000
- 2020: $6,000
- 2021: $6,000
- 2022: $6,000
- 2023: $6,500
- 2024: $7,000
- 2025: $7,000
- 2026: $7,000

## Non-goals

- No authentication.
- No bank API integrations.
- No CRA integrations.
- No investment recommendations.
- No tax filing.
- No mobile app.
- No multi-user support.
