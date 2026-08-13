import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  ...(process.env.PLAYWRIGHT_EXTERNAL_SERVER === "true" ? {} : {
    webServer: {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
      url: `${process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  }),
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
