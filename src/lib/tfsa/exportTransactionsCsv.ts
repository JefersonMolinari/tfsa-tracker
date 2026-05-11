export const transactionCsvHeaders = [
  "transaction_id",
  "account_id",
  "account_name",
  "institution",
  "transaction_type",
  "amount_cents",
  "amount_cad",
  "occurred_at",
  "notes",
  "created_at",
  "updated_at",
] as const;

export type TransactionCsvExportRow = {
  id: string;
  accountId: string;
  type: string;
  amountCents: number;
  occurredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  account: {
    name: string;
    institution: string;
  };
};

function formatAmountCentsAsCad(amountCents: number): string {
  const isNegative = amountCents < 0;
  const absoluteCents = Math.abs(amountCents);
  const dollars = Math.trunc(absoluteCents / 100);
  const cents = absoluteCents % 100;
  const value = `${dollars}.${cents.toString().padStart(2, "0")}`;

  return isNegative ? `-${value}` : value;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function buildCsvLine(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}

export function serializeTransactionsToCsv(rows: TransactionCsvExportRow[]): string {
  const lines = [
    buildCsvLine([...transactionCsvHeaders]),
    ...rows.map((row) =>
      buildCsvLine([
        row.id,
        row.accountId,
        row.account.name,
        row.account.institution,
        row.type,
        String(row.amountCents),
        formatAmountCentsAsCad(row.amountCents),
        row.occurredAt.toISOString(),
        row.notes ?? "",
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ]),
    ),
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function buildTransactionsCsvFilename(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `tfsa-transactions-${year}-${month}-${day}.csv`;
}
