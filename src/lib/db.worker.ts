import { PrismaD1 } from "@prisma/adapter-d1";
import { env } from "cloudflare:workers";

import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaD1(env.DB);

export const db = new PrismaClient({ adapter });
export const getD1Database = () => env.DB;
