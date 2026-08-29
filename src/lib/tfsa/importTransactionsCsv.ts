import { TransactionType } from "@/generated/prisma/client";

import { transactionCsvHeaders } from "./exportTransactionsCsv";
import {
  MAX_TFSA_IMPORT_ACCOUNTS,
  MAX_TFSA_IMPORT_TRANSACTIONS,
} from "./importLimits";

export type TransactionCsvImportRow = {
  transactionId: string;
  accountId: string;
  accountName: string;
  institution: string;
  type: TransactionType;
  amountCents: number;
  occurredAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const transactionTypeValues = new Set(Object.values(TransactionType));

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (inQuotes) {
      if (character === "\"" && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else if (character === "\"") {
        inQuotes = false;
      } else {
        cell += character;
      }

      continue;
    }

    if (character === "\"") {
      if (cell.length > 0) {
        throw new Error("Invalid CSV quoting.");
      }

      inQuotes = true;
      continue;
    }

    if (character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (inQuotes) {
    throw new Error("Invalid CSV quoting.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.length > 1 || item[0] !== "");
}

function parseRequiredText(value: string, field: string, rowNumber: number): string {
  if (!value.trim()) {
    throw new Error(`Row ${rowNumber} has an empty ${field}.`);
  }

  return value;
}

function parseIntegerCents(value: string, rowNumber: number): number {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Row ${rowNumber} has an invalid amount_cents value.`);
  }

  const amountCents = Number(value);

  if (!Number.isSafeInteger(amountCents)) {
    throw new Error(`Row ${rowNumber} has an amount_cents value outside the safe integer range.`);
  }

  return amountCents;
}

function parseIsoDate(value: string, field: string, rowNumber: number): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(`Row ${rowNumber} has an invalid ${field} date.`);
  }

  return date;
}

function parseTransactionType(value: string, rowNumber: number): TransactionType {
  if (!transactionTypeValues.has(value as TransactionType)) {
    throw new Error(`Row ${rowNumber} has an invalid transaction_type value.`);
  }

  return value as TransactionType;
}

function assertExpectedHeaders(headers: string[]) {
  const expectedHeaders = [...transactionCsvHeaders];
  const matches =
    headers.length === expectedHeaders.length &&
    headers.every((header, index) => header === expectedHeaders[index]);

  if (!matches) {
    throw new Error("CSV headers must match the exported transactions CSV format.");
  }
}

export function parseTransactionsCsvImport(csv: string): TransactionCsvImportRow[] {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;

  if (!headers) {
    throw new Error("CSV file is empty.");
  }

  assertExpectedHeaders(headers);

  if (dataRows.length > MAX_TFSA_IMPORT_TRANSACTIONS) {
    throw new Error("CSV cannot contain more than 10,000 transactions.");
  }

  const accountIds = new Set<string>();

  return dataRows.map((row, index) => {
    const rowNumber = index + 2;

    if (row.length !== transactionCsvHeaders.length) {
      throw new Error(`Row ${rowNumber} does not have the expected number of columns.`);
    }

    const [
      transactionId,
      accountId,
      accountName,
      institution,
      type,
      amountCents,
      ,
      occurredAt,
      notes,
      createdAt,
      updatedAt,
    ] = row;

    const parsedRow = {
      transactionId: parseRequiredText(transactionId, "transaction_id", rowNumber),
      accountId: parseRequiredText(accountId, "account_id", rowNumber),
      accountName: parseRequiredText(accountName, "account_name", rowNumber),
      institution: parseRequiredText(institution, "institution", rowNumber),
      type: parseTransactionType(type, rowNumber),
      amountCents: parseIntegerCents(amountCents, rowNumber),
      occurredAt: parseIsoDate(occurredAt, "occurred_at", rowNumber),
      notes: notes || null,
      createdAt: parseIsoDate(createdAt, "created_at", rowNumber),
      updatedAt: parseIsoDate(updatedAt, "updated_at", rowNumber),
    };

    accountIds.add(parsedRow.accountId);
    if (accountIds.size > MAX_TFSA_IMPORT_ACCOUNTS) {
      throw new Error("CSV cannot contain more than 2,000 accounts.");
    }

    return parsedRow;
  });
}
