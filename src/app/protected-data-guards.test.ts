import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

const redirect = vi.fn((path: string): never => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
const revalidatePath = vi.fn();
let currentCookie: string | undefined;
const cookies = vi.fn(async () => ({
  get: (name: string) =>
    name === SESSION_COOKIE_NAME && currentCookie
      ? { name, value: currentCookie }
      : undefined,
}));
const db = {
  account: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transaction: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  userSettings: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};
const getAppData = vi.fn();
const getTransactionsPageData = vi.fn();
const getTransactionsCsvExportData = vi.fn();

vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/tfsa/data", () => ({
  getAppData,
  getTransactionsPageData,
  getTransactionsCsvExportData,
}));

const secrets = {
  password: crypto.randomUUID(),
  sessionSecret: crypto.randomUUID(),
};

beforeEach(() => {
  vi.clearAllMocks();
  currentCookie = undefined;
  process.env.TFSA_PASSWORD = secrets.password;
  process.env.TFSA_SESSION_SECRET = secrets.sessionSecret;
});

function expectNoDataAccess() {
  expect(getAppData).not.toHaveBeenCalled();
  expect(getTransactionsPageData).not.toHaveBeenCalled();
  expect(getTransactionsCsvExportData).not.toHaveBeenCalled();
  expect(db.account.create).not.toHaveBeenCalled();
  expect(db.account.update).not.toHaveBeenCalled();
  expect(db.account.delete).not.toHaveBeenCalled();
  expect(db.transaction.create).not.toHaveBeenCalled();
  expect(db.transaction.update).not.toHaveBeenCalled();
  expect(db.transaction.delete).not.toHaveBeenCalled();
  expect(db.userSettings.upsert).not.toHaveBeenCalled();
  expect(db.$transaction).not.toHaveBeenCalled();
}

describe("direct server action guards", () => {
  it.each([
    "createAccount",
    "updateAccount",
    "deleteAccount",
    "createTransaction",
    "updateTransaction",
    "deleteTransaction",
    "importTransactionsCsv",
    "saveSettings",
  ] as const)("blocks %s before parsing or writing without a session", async (name) => {
    const actions = await import("./actions");

    await expect(actions[name](new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expectNoDataAccess();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("blocks a tampered session before an account write", async () => {
    const validCookie = await createSessionCookie(secrets);
    const [payload, signature] = validCookie.split(".");
    currentCookie = `${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    const { createAccount } = await import("./actions");

    await expect(createAccount(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expectNoDataAccess();
  });
});

describe("direct export guard", () => {
  it("blocks a missing session before reading export data", async () => {
    const { GET } = await import("./transactions/export/route");

    await expect(GET()).rejects.toThrow("NEXT_REDIRECT:/login");
    expectNoDataAccess();
  });
});

describe("direct protected page guards", () => {
  it("blocks the dashboard before reading data", async () => {
    const { default: Home } = await import("./page");

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT:/login");
    expectNoDataAccess();
  });

  it("blocks accounts before reading data", async () => {
    const { default: AccountsPage } = await import("./accounts/page");

    await expect(AccountsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expectNoDataAccess();
  });

  it("blocks transactions before reading data", async () => {
    const { default: TransactionsPage } = await import("./transactions/page");

    await expect(
      TransactionsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");
    expectNoDataAccess();
  });

  it("blocks settings before reading data", async () => {
    const { default: SettingsPage } = await import("./settings/page");

    await expect(SettingsPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expectNoDataAccess();
  });
});
