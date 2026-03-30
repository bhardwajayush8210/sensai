import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // ✅ Prisma v7 way
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// globalThis.prisma: This global variable ensures that the Prisma client instance is
// reused across hot reloads during development. Without this, each time your application
// reloads, a new instance of the Prisma client would be created, potentially leading
// to connection issues.
