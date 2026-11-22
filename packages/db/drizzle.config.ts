import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://ijazah:ijazah@localhost:5433/ijazah",
  },
  extensionsFilters: ["postgis"],
});
