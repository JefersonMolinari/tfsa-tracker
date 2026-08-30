<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# Codex Instructions for TFSA Tracker

## Product direction

This is a private, hosted, single-user personal finance app for tracking TFSA contribution room. It uses a Cloudflare Worker password gate and central Cloudflare D1 storage at `https://tfsa.molinaristudios.com`.

Do not add:
- Public access, self-service registration, or multi-user support
- Bank integrations
- CRA integrations
- Investment advice
- Payment features
- Multi-user support

## Engineering direction

Use:
- Next.js
- TypeScript
- Tailwind
- Prisma
- SQLite
- Cloudflare Workers
- Cloudflare D1
- Vitest

Store money as integer cents, never floating-point dollars.

Keep TFSA contribution-room logic in pure TypeScript utility functions.

Do not duplicate contribution-room logic in React components.

For every commit that includes Codex-generated code, add `[GENERATED]` to the commit message.

## Data privacy

Never ask for or store:
- CRA credentials
- Bank passwords
- Brokerage passwords
- SIN
- Account numbers

Keep `TFSA_PASSWORD` and `TFSA_SESSION_SECRET` as Cloudflare Worker secrets. They must never appear as values in source code, tests, committed environment files, GitHub Actions, or documentation. GitHub deployment credentials are limited to `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets and are separate from Worker session secrets.

## UI direction

The app should feel calm and practical.

Use:
- Green for safe contribution room
- Yellow for low remaining room
- Red for over-contribution risk

Always label contribution room as estimated.
