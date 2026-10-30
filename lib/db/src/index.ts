import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import { createLocalPostgresPool } from "./local-db";

const { Pool } = pg;

// Auto-load .env if not loaded
if (typeof process.loadEnvFile === "function") {
  let cur = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(cur, ".env");
    if (fs.existsSync(candidate)) {
      try {
        process.loadEnvFile(candidate);
        break;
      } catch {}
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}

const useRemote = process.env.USE_REMOTE_DB !== "false" && Boolean(process.env.DATABASE_URL);

let pool: any;

if (useRemote) {
  console.log("[DB] Using remote PostgreSQL database connection (Supabase).");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") || process.env.DATABASE_URL?.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
  });
} else {
  console.log("[DB] Using local resilient PostgreSQL database engine with automatic file persistence.");
  const local = createLocalPostgresPool();
  pool = local.pool;
}

export { pool };
export const db = drizzle(pool, { schema });
export * from "./schema";
