import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export * from "./schema.js";
export { schema };

export type Db = ReturnType<typeof createDb>;

export function createDb(url?: string) {
  const connectionString =
    url ?? process.env.DATABASE_URL ?? "postgres://ijazah:ijazah@localhost:5433/ijazah";
  const client = postgres(connectionString, { max: 10, idle_timeout: 20 });
  return drizzle(client, { schema });
}
