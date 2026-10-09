// Throwaway local Postgres (embedded-postgres, no Docker) used by the API tests.
// Random port per run (kept in process.env so vitest.config and globalSetup agree) so a
// leftover server from an interrupted run never blocks the next one.
process.env.TEST_PG_PORT ??= String(55000 + Math.floor(Math.random() * 5000));
export const TEST_PG_PORT = Number(process.env.TEST_PG_PORT);
export const TEST_DB_URL = `postgresql://postgres:postgres@localhost:${TEST_PG_PORT}/trabawho_test`;
export const TEST_ENV = { NODE_ENV: "test", DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL, JWT_SECRET: "test-secret" };
