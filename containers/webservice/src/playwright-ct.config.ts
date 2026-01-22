import { defineConfig, devices } from '@playwright/experimental-ct-react';

/**
 * Playwright Component Testing Configuration
 *
 * Handles isolated component tests without a running server.
 */
export default defineConfig({
  testDir: './tests/unit/components',
  testMatch: ['**/*.test.{ts,tsx}'],

  timeout: 10000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  reporter: [
    ['html', { outputFolder: 'playwright-ct-report' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    ctPort: 3100,                    // Different port for CT server
    ctViteConfig: {
      resolve: {
        alias: {
          '@': '/src',               // Match Next.js path alias
        },
      },
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
