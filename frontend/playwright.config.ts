import { defineConfig, devices } from '@playwright/test';

const isCI = !!(globalThis as typeof globalThis & { process?: { env?: { CI?: string } } }).process?.env?.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html'],
    [
      'monocart-reporter',
      {
        name: 'Playwright E2E Coverage Report',
        outputFile: './coverage-e2e/report.html',
        coverage: {
          entryFilter: (entry: { url: string }) =>
            entry.url.includes('/src/') &&
            !entry.url.includes('node_modules') &&
            !entry.url.includes('.css'),
          sourceFilter: (sourcePath: string) =>
            !sourcePath.includes('node_modules') &&
            !sourcePath.includes('.css'),
          reports: ['v8', 'console-summary'],
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
  },
});