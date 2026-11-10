import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations usam a conexão direta (sem pooler) quando disponível — no Neon,
// a integração da Vercel injeta DATABASE_URL_UNPOOLED automaticamente.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
