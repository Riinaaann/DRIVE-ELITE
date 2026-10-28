import fs from "node:fs";
import path from "node:path";

// Ensure .env is loaded if running locally
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

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
