import { defineConfig, devices } from "@playwright/test";
const production = process.env.E2E_PRODUCTION === "1";
const baseURL = "http://127.0.0.1:" + (production ? 3107 : 3000);
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: production ? "npm run start -- --port 3107" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI && !production,
    timeout: 120000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
