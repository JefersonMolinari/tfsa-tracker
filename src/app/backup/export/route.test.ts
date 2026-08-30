import { afterEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const getFullBackupData = vi.fn(async () => {
  calls.push("read");
  return {
    settings: {
      id: 1,
      startingYear: 2024,
      startingContributionRoomCents: 1_250_000,
      contributionRoomNotes: "Verified locally",
      createdAt: new Date("2026-01-01T01:00:00.000Z"),
      updatedAt: new Date("2026-02-01T02:00:00.000Z"),
    },
    accounts: [
      {
        id: "acct_1",
        name: "Main TFSA",
        institution: "Local Bank",
        notes: null,
        createdAt: new Date("2026-01-02T01:00:00.000Z"),
        updatedAt: new Date("2026-02-02T02:00:00.000Z"),
      },
    ],
    transactions: [
      {
        id: "txn_1",
        accountId: "acct_1",
        type: "CONTRIBUTION" as const,
        amountCents: 250_000,
        occurredAt: new Date("2026-01-15T12:30:00.000Z"),
        notes: "January contribution",
        createdAt: new Date("2026-01-15T12:31:00.000Z"),
        updatedAt: new Date("2026-01-15T12:32:00.000Z"),
      },
    ],
  };
});

vi.mock("@/lib/auth/session", () => ({
  requireSession: vi.fn(async () => {
    calls.push("session");
    return { exp: 1_800_000_000 };
  }),
}));

vi.mock("@/lib/tfsa/data", () => ({ getFullBackupData }));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  calls.length = 0;
});

describe("GET /backup/export", () => {
  it("authenticates before returning a dynamic no-store version-1 JSON attachment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T18:45:00.000Z"));

    const { dynamic, GET } = await import("./route");
    const response = await GET();

    expect(dynamic).toBe("force-dynamic");
    expect(calls).toEqual(["session", "read"]);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="tfsa-full-backup-2026-05-09.json"',
    );
    await expect(response.json()).resolves.toEqual({
      version: 1,
      settings: {
        id: 1,
        startingYear: 2024,
        startingContributionRoomCents: 1_250_000,
        contributionRoomNotes: "Verified locally",
        createdAt: "2026-01-01T01:00:00.000Z",
        updatedAt: "2026-02-01T02:00:00.000Z",
      },
      accounts: [
        {
          id: "acct_1",
          name: "Main TFSA",
          institution: "Local Bank",
          notes: null,
          createdAt: "2026-01-02T01:00:00.000Z",
          updatedAt: "2026-02-02T02:00:00.000Z",
        },
      ],
      transactions: [
        {
          id: "txn_1",
          accountId: "acct_1",
          type: "CONTRIBUTION",
          amountCents: 250_000,
          occurredAt: "2026-01-15T12:30:00.000Z",
          notes: "January contribution",
          createdAt: "2026-01-15T12:31:00.000Z",
          updatedAt: "2026-01-15T12:32:00.000Z",
        },
      ],
    });
  });
});
