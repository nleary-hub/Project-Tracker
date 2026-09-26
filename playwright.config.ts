import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the interactive tables and the main workflows.
 *
 * They run against a production build (`next start`) so Fast Refresh can't
 * reset component state mid-test: run `pnpm build` first (CI does), then
 * `pnpm test:e2e`. A Supabase project is needed (local `supabase start` in CI,
 * the hosted one locally via .env.local) with the two e2e users from
 * supabase/seed.sql; the global setup signs them in and (re)creates a fixture
 * workspace.
 */
const port = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // `channel: "chromium"` runs the full Chromium build in new-headless mode, so
  // only `playwright install chromium` is needed (no separate headless shell).
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --port ${port}`,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
