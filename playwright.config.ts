import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'visual',
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    // A fixed viewport and a device pixel ratio of 1 keep the two drawings
    // comparable pixel by pixel.
    viewport: { width: 800, height: 900 },
    deviceScaleFactor: 1,
    baseURL: 'http://localhost:5176',
  },
  webServer: {
    command: 'npx vite --config demo/vite.config.ts --port 5176 --strictPort',
    url: 'http://localhost:5176/parity.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
