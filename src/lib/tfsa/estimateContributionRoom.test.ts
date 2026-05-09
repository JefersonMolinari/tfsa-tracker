import { describe, expect, it } from "vitest";

import annualLimits from "../../../prisma/tfsa-annual-limits.json";
import {
  estimateTfsaContributionRoom,
  type TfsaAnnualLimit,
} from "./estimateContributionRoom";

const limits = annualLimits as TfsaAnnualLimit[];

describe("estimateTfsaContributionRoom", () => {
  it("returns $5,000 of 2026 room after a $2,000 contribution from a $7,000 start", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-06-15T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-02-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 200000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(500000);
    expect(estimate.contributionsThisYearCents).toBe(200000);
    expect(estimate.isOvercontributed).toBe(false);
  });

  it("keeps 2026 room unchanged after a 2026 withdrawal and restores it in 2027", () => {
    const estimate2026 = estimateTfsaContributionRoom({
      asOf: "2026-10-15T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-03-01T00:00:00.000Z",
          type: "WITHDRAWAL",
          amountCents: 300000,
        },
      ],
    });

    const estimate2027 = estimateTfsaContributionRoom({
      asOf: "2027-01-02T00:00:00.000Z",
      annualLimits: [...limits, { year: 2027, limitCents: 700000 }],
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-03-01T00:00:00.000Z",
          type: "WITHDRAWAL",
          amountCents: 300000,
        },
      ],
    });

    expect(estimate2026.availableContributionRoomCents).toBe(700000);
    expect(estimate2026.withdrawalsThisYearCents).toBe(300000);
    expect(estimate2027.restoredFromPriorYearWithdrawalsCents).toBe(300000);
    expect(estimate2027.availableContributionRoomCents).toBe(1700000);
  });

  it("shares contribution room across multiple accounts", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-08-01T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-02-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 300000,
        },
        {
          occurredAt: "2026-04-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 200000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(200000);
    expect(estimate.contributionsThisYearCents).toBe(500000);
  });

  it("ignores a qualifying TFSA-to-TFSA transfer of $5,000", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-07-01T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-03-01T00:00:00.000Z",
          type: "QUALIFYING_TRANSFER",
          amountCents: 500000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(700000);
    expect(estimate.contributionsThisYearCents).toBe(0);
  });

  it("ignores a $1,200 market gain for contribution room", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-09-01T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-05-01T00:00:00.000Z",
          type: "MARKET_ADJUSTMENT",
          amountCents: 120000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(700000);
    expect(estimate.contributionsThisYearCents).toBe(0);
    expect(estimate.withdrawalsThisYearCents).toBe(0);
  });

  it("returns an over-contribution warning when a contribution exceeds available room", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-12-31T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2026,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2026-06-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 800000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(-100000);
    expect(estimate.isOvercontributed).toBe(true);
  });

  it("reduces room for same-year contributions", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2024-06-15T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2024,
        startingContributionRoomCents: 950000,
      },
      transactions: [
        {
          occurredAt: "2024-02-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 250000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(700000);
    expect(estimate.contributionsThisYearCents).toBe(250000);
    expect(estimate.withdrawalsThisYearCents).toBe(0);
    expect(estimate.isOvercontributed).toBe(false);
  });

  it("restores prior-year withdrawals on January 1 of the following year", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2025-02-01T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2024,
        startingContributionRoomCents: 950000,
      },
      transactions: [
        {
          occurredAt: "2024-03-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 250000,
        },
        {
          occurredAt: "2024-11-01T00:00:00.000Z",
          type: "WITHDRAWAL",
          amountCents: 100000,
        },
      ],
    });

    expect(estimate.annualLimitThisYearCents).toBe(700000);
    expect(estimate.restoredFromPriorYearWithdrawalsCents).toBe(100000);
    expect(estimate.availableContributionRoomCents).toBe(1500000);
  });

  it("carries forward prior-year contributions when estimating a later year", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-01-10T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2024,
        startingContributionRoomCents: 950000,
      },
      transactions: [
        {
          occurredAt: "2024-04-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 250000,
        },
        {
          occurredAt: "2025-03-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 300000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(1800000);
  });

  it("ignores transfers, fees, market changes, and income events for room estimation", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2026-04-30T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2025,
        startingContributionRoomCents: 700000,
      },
      transactions: [
        {
          occurredAt: "2025-06-01T00:00:00.000Z",
          type: "QUALIFYING_TRANSFER",
          amountCents: 300000,
        },
        {
          occurredAt: "2025-07-01T00:00:00.000Z",
          type: "FEE",
          amountCents: 5000,
        },
        {
          occurredAt: "2026-01-15T00:00:00.000Z",
          type: "DIVIDEND",
          amountCents: 12000,
        },
        {
          occurredAt: "2026-02-15T00:00:00.000Z",
          type: "INTEREST",
          amountCents: 8000,
        },
        {
          occurredAt: "2026-03-15T00:00:00.000Z",
          type: "MARKET_ADJUSTMENT",
          amountCents: 45000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(1400000);
    expect(estimate.contributionsThisYearCents).toBe(0);
    expect(estimate.withdrawalsThisYearCents).toBe(0);
  });

  it("flags over-contribution risk when contributions exceed available room", () => {
    const estimate = estimateTfsaContributionRoom({
      asOf: "2024-12-31T00:00:00.000Z",
      annualLimits: limits,
      settings: {
        startingYear: 2024,
        startingContributionRoomCents: 300000,
      },
      transactions: [
        {
          occurredAt: "2024-05-01T00:00:00.000Z",
          type: "CONTRIBUTION",
          amountCents: 450000,
        },
      ],
    });

    expect(estimate.availableContributionRoomCents).toBe(-150000);
    expect(estimate.isOvercontributed).toBe(true);
  });

  it("throws when a later year is missing an annual limit", () => {
    expect(() =>
      estimateTfsaContributionRoom({
        asOf: "2026-01-10T00:00:00.000Z",
        annualLimits: limits.filter((limit) => limit.year !== 2026),
        settings: {
          startingYear: 2025,
          startingContributionRoomCents: 700000,
        },
        transactions: [],
      }),
    ).toThrow("Missing annual limit for year 2026.");
  });
});
