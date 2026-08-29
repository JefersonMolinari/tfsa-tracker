import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { serializeTfsaBackup } from "./backup";
import { getFullBackupData } from "./data";

describe("Worker full-backup snapshot", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM "Transaction"'),
      env.DB.prepare('DELETE FROM "Account"'),
      env.DB.prepare('DELETE FROM "UserSettings"'),
      env.DB.prepare(
        'INSERT INTO "UserSettings" ("id", "startingYear", "startingContributionRoomCents", "contributionRoomNotes", "createdAt", "updatedAt") VALUES (1, 2024, 0, NULL, ?, ?)',
      ).bind("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"),
      env.DB.prepare(
        'INSERT INTO "Account" ("id", "name", "institution", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, NULL, ?, ?)',
      ).bind(
        "acct_1",
        "Main TFSA",
        "Institution",
        "2026-01-03T00:00:00.000Z",
        "2026-01-04T00:00:00.000Z",
      ),
      env.DB.prepare(
        'INSERT INTO "Transaction" ("id", "accountId", "type", "amountCents", "occurredAt", "notes", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
      ).bind(
        "txn_1",
        "acct_1",
        "CONTRIBUTION",
        100,
        "2026-01-05T00:00:00.000Z",
        "2026-01-06T00:00:00.000Z",
        "2026-01-07T00:00:00.000Z",
      ),
    ]);
  });

  it("returns a serializable, referentially complete D1 snapshot", async () => {
    const snapshot = await getFullBackupData();

    expect(JSON.parse(serializeTfsaBackup(snapshot))).toMatchObject({
      settings: { id: 1, startingYear: 2024 },
      accounts: [{ id: "acct_1" }],
      transactions: [{ id: "txn_1", accountId: "acct_1" }],
    });
    expect(snapshot.accounts[0].createdAt).toBeInstanceOf(Date);
    expect(snapshot.transactions[0].occurredAt).toBeInstanceOf(Date);
  });
});
