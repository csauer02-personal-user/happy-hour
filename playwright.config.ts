import { defineConfig, devices } from "@playwright/test";

const MOCK_SUPABASE_PORT = 54399;
const MOCK_SUPABASE_URL = `http://127.0.0.1:${MOCK_SUPABASE_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "mobile-portrait",
      use: { ...devices["iPhone 13"], viewport: { width: 375, height: 812 } },
    },
    {
      name: "mobile-landscape",
      use: {
        ...devices["iPhone 13 landscape"],
        viewport: { width: 812, height: 375 },
      },
    },
    {
      name: "tablet",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: [
    {
      command: "npx tsx e2e/start-mock-server.ts",
      url: MOCK_SUPABASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: MOCK_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-for-e2e",
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "test-maps-key-for-e2e",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      },
    },
  ],
});
