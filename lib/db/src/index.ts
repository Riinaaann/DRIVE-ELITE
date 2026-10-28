import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

// Auto-load .env if DATABASE_URL is not set
if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
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

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
