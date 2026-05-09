import path from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

declare global {
  var __tfsaPrisma__: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.resolve(process.cwd(), "prisma/dev.db")}`,
  });

  return new PrismaClient({ adapter });
}

export const db = global.__tfsaPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__tfsaPrisma__ = db;
}
