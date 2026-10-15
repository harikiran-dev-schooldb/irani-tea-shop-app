import { neon } from "@neondatabase/serverless";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (database) return database;
  const connectionString = env.DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Add the pooled Neon connection string to your environment.");
  database = drizzle(neon(connectionString), { schema });
  return database;
}
