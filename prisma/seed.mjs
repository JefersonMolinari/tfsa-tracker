import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import annualLimits from "./tfsa-annual-limits.json" with { type: "json" };

const prismaDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabaseUrl = `file:${path.resolve(prismaDirectory, "dev.db")}`;

function resolveDatabaseUrl(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const sqlitePath = databaseUrl.slice("file:".length);
  if (sqlitePath === ":memory:" || path.isAbsolute(sqlitePath)) {
    return databaseUrl;
  }

  return `file:${path.resolve(prismaDirectory, sqlitePath)}`;
}

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL ?? defaultDatabaseUrl);

const adapter = new PrismaBetterSqlite3({
  url: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  for (const annualLimit of annualLimits) {
    await prisma.annualLimit.upsert({
      where: { year: annualLimit.year },
      update: { limitCents: annualLimit.limitCents },
      create: annualLimit,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
