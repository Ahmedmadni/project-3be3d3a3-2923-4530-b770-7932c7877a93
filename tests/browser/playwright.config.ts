import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  testMatch: "**/*.browser.ts",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  projects: [
    { name: "Android-Chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "iPhone-WebKit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  reporter: [["list"]],
  outputDir: "../../test-results/pregnancy-browser",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
