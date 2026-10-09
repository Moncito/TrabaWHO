import { defineConfig } from "vitest/config";
import { TEST_ENV } from "./test/env";

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    env: TEST_ENV,
    testTimeout: 30_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
