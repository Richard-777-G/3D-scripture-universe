import { defineConfig, devices } from "@playwright/test";

// Software WebGL so the 3D scene renders on CI machines without a GPU.
const gl = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const port = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${port}/`,
    trace: "off",
    launchOptions: { args: gl },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
  ],
  // Tests run against the production build. Run `npm run build` first.
  webServer: process.env.BASE_URL
    ? undefined
    : { command: `npx vite preview --port ${port} --strictPort`, port, reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
