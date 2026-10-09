import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import { TEST_ENV, TEST_PG_PORT } from "./env";

/**
 * On Windows, stop() can leave postgres child processes (io workers) holding the port and data dir.
 * Kill only processes running this repo's embedded-postgres binary.
 */
function killStrayPostgres() {
  let bin: string;
  try {
    bin = dirname(createRequire(import.meta.url).resolve("@embedded-postgres/windows-x64/package.json"));
  } catch {
    return;
  }
  const ps = `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith('${bin.replace(/'/g, "''")}', 'OrdinalIgnoreCase') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore", timeout: 15_000 });
  } catch {
    // Best effort.
  }
}

/** Start a throwaway Postgres, apply the real migrations, tear it down after the run. */
export default async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "trabawho-pg-"));
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "postgres",
    password: "postgres",
    port: TEST_PG_PORT,
    persistent: true, // we remove the temp dir ourselves (the library's cleanup hits EBUSY on Windows)
    onLog: () => undefined,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("trabawho_test");

  const here = dirname(fileURLToPath(import.meta.url));
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", resolve(here, "../prisma/schema.prisma")], {
    env: { ...process.env, ...TEST_ENV },
    stdio: "pipe",
  });

  return async () => {
    await pg.stop();
    if (process.platform === "win32") killStrayPostgres();
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    } catch {
      // Windows may still hold a file handle for a moment; it is only a temp dir.
    }
  };
}
