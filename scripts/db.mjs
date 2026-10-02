// Local development database — real PostgreSQL via embedded-postgres.
// Free, no system install, no admin rights. Data persists in ./.pgdata.
// Usage: npm run db:dev   (keep running while developing)
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
dotenv.config();

const DATA_DIR = path.resolve(process.cwd(), ".pgdata");
const PORT = 55432;

if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:55432")) {
  console.log("\n⚠️  [NOTICE] Your .env is currently configured to use an EXTERNAL database (e.g. Supabase Cloud).");
  console.log("   You DO NOT need to run 'npm run db:dev'!");
  console.log("   Supabase is already running 24/7 in the cloud. You only need to run 'npm run dev'.\n");
}

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

const initialized = existsSync(path.join(DATA_DIR, "PG_VERSION"));

async function main() {
  if (!initialized) {
    console.log("Initializing PostgreSQL data directory (first run)...");
    await pg.initialise();
  }
  await pg.start();
  if (!initialized) {
    await pg.createDatabase("drishti");
  }
  console.log("");
  console.log("PostgreSQL is running (embedded, free, local).");
  console.log(`  DATABASE_URL=postgres://postgres:postgres@localhost:${PORT}/drishti`);
  console.log("");
  console.log("Press Ctrl+C to stop.");
}

async function shutdown() {
  console.log("\nStopping PostgreSQL...");
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (err) => {
  console.error(err);
  try {
    await pg.stop();
  } catch {}
  process.exit(1);
});
