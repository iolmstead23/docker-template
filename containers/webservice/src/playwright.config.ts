import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for 3E Data Toolkit Webservices
 *
 * This config handles E2E and integration tests against the running Next.js server.
 * For component tests, see playwright-ct.config.ts
 */
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/tests/**/*.test.{ts,tsx}'],

  // Exclude component tests (handled by separate config)
  testIgnore: ['**/tests/unit/components/**'],

  // Timeout configuration
  timeout: 30000,                    // 30s per test
  expect: {
    timeout: 5000,                   // 5s for assertions
  },

  // Test execution
  fullyParallel: true,               // Run tests in parallel
  forbidOnly: !!process.env.CI,     // Fail if test.only in CI
  retries: process.env.CI ? 2 : 0,  // Retry flaky tests in CI
  workers: process.env.CI ? undefined : undefined, // Use all CPU cores

  // Reporter configuration
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
        ['github'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
      ],

  // Global test setup/teardown
  globalSetup: require.resolve('./tests/helpers/global-setup.ts'),
  globalTeardown: require.resolve('./tests/helpers/global-teardown.ts'),

  use: {
    // Base URL configuration
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',

    // Browser options
    headless: !!process.env.CI,
    viewport: { width: 1280, height: 720 },

    // Tracing and debugging
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Network
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Context options
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },

  // Projects for multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Run all tests on Chromium (API, E2E, integration)
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Skip API tests on Firefox (backend tests don't need cross-browser testing)
      testIgnore: ['**/tests/integration/api/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // Skip API tests on WebKit (backend tests don't need cross-browser testing)
      testIgnore: ['**/tests/integration/api/**'],
    },
  ],

  // Web server configuration
  webServer: {
    // Points to Next.js dev server (not Nginx proxy)
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',                   // Show stdout for debugging
    stderr: 'pipe',
    timeout: 120000,                  // 2 minutes for server startup
    env: {
      NODE_ENV: 'test',
      PORT: '3001',                   // Next.js respects PORT env var
      STATE_PATH: './test-state',     // Separate state for tests
      OTEL_SDK_DISABLED: 'true',      // Disable OpenTelemetry in tests
      TELEMETRY_HOST: 'localhost',
      TELEMETRY_PORT: '8081',
    },
  },
});
