import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export function criarPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Reaproveita uma única instância por processo (evita esgotar conexões no hot reload).
const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? criarPrisma();
if (process.env.NODE_ENV !== "production") g.prisma = db;

export type Db = PrismaClient;
