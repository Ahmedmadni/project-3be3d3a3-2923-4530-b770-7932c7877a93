import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "**/*.browser.ts",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  outputDir: "../../test-results/pregnancy-browser",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
