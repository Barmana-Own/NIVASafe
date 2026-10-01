import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.08,
    },
  },
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "./playwright-results",
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:5043",
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    colorScheme: "light",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5043",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
