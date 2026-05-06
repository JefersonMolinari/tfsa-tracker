<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# Codex Instructions for TFSA Tracker

## Product direction

This is a private, local-only personal finance app for tracking TFSA contribution room.

Do not add:
- Authentication
- Cloud database
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
- Vitest

Store money as integer cents, never floating-point dollars.

Keep TFSA contribution-room logic in pure TypeScript utility functions.

Do not duplicate contribution-room logic in React components.

## Data privacy

Never ask for or store:
- CRA credentials
- Bank passwords
- Brokerage passwords
- SIN
- Account numbers

## UI direction

The app should feel calm and practical.

Use:
- Green for safe contribution room
- Yellow for low remaining room
- Red for over-contribution risk

Always label contribution room as estimated.