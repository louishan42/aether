import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export const databaseReady = Boolean(process.env.DATABASE_URL);
