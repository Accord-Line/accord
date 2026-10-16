import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  // Keep browser startup predictable on modest Windows laptops and CI runners.
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-report.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173/accord/', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1080 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run build:pages && npm run preview -- --port 4173 --strictPort --base=/accord/',
    url: 'http://127.0.0.1:4173/accord/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
