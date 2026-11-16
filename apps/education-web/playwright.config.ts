import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", channel: "chrome", viewport: { width: 375, height: 812 } } },
  ],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort", url: "http://127.0.0.1:5173", reuseExistingServer: true, timeout: 30000 },
});
