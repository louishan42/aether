import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

export const prisma = new PrismaClient();
export const databaseReady =
  databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");
