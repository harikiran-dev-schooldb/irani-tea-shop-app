import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

config({ path: ".env.local" });
config();

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required for migrations.");
}

const normalizedUrl = connectionString.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/i, "$1verify-full");
const pool = new pg.Pool({ connectionString: normalizedUrl, max: 1, application_name: "irani-tea-migrations" });

try {
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  console.log("Neon database migrations are up to date.");
} finally {
  await pool.end();
}
