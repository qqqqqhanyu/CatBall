import { defineConfig, devices } from "@playwright/test";

const channel =
  process.env.CI || process.env.PLAYWRIGHT_BUNDLED ? undefined : "chrome";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  // GitHub runners render WebGL on CPU. Concurrent rounds starve each other's
  // game clock; run one at a time there, while local GPU machines can use two.
  workers: process.env.CI ? 1 : 2,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:5173/CatBall/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
        defaultBrowserType: "chromium",
        channel,
        viewport: { width: 844, height: 390 },
        screen: { width: 844, height: 390 },
        deviceScaleFactor: 2,
      },
    },
    {
      name: "mobile-webkit",
      // CDP multi-touch tests are Chromium-only. This suite uses portable input.
      testMatch: /(?:compatibility|v1-1)\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 844, height: 390 },
        screen: { width: 844, height: 390 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173/CatBall/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
