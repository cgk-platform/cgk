import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient;
}

function buildPrismaClient() {
  // Append connect_timeout for Neon cold starts (auto-suspend → first connect can take 3-5s)
  const url = process.env.DATABASE_URL;

  return new PrismaClient({
    datasourceUrl: url
      ? url + (url.includes("connect_timeout") ? "" : "&connect_timeout=30")
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = buildPrismaClient();
  }
}

const prisma = global.prismaGlobal ?? buildPrismaClient();

export default prisma;
