import "dotenv/config";
import { defineConfig } from "prisma/config";

const cliDatabaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma CLI should use a direct TCP connection when a pooled URL is used at runtime.
    url: cliDatabaseUrl,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
