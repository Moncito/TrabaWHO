/**
 * Local PostgreSQL for the demo laptop, no install and no Docker:
 *   npm run db:local -w apps/api
 * Starts Postgres (from the `embedded-postgres` npm package) on port 5432, keeps data in
 * apps/api/.pgdata (git-ignored), creates the `trabawho` database, and runs until Ctrl+C.
 * Matching .env:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trabawho"
 *   DIRECT_URL="postgresql://postgres:postgres@localhost:5432/trabawho"
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".pgdata");
const port = Number(process.env.PGPORT ?? 5432);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user: "postgres",
  password: "postgres",
  persistent: true,
  onLog: () => undefined,
  onError: (e) => console.error("[postgres]", e),
});

if (!existsSync(join(dataDir, "PG_VERSION"))) {
  console.log(`Creating a new database cluster in ${dataDir} ...`);
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("trabawho");
  console.log("Created database 'trabawho'.");
} catch {
  // already exists
}
console.log(`PostgreSQL running on localhost:${port} (database trabawho, user postgres). Press Ctrl+C to stop.`);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await pg.stop().catch(() => undefined);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => undefined, 1 << 30); // keep the process alive
