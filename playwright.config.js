// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const { devices } = require('@playwright/test');

const config = {
  testDir: './tests',
  testIgnore: ['diagnostics/**'],
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  // Run tests in files in parallel
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  // Opt out of parallel tests on CI.
  workers: 1,
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: 'html',
  // Global setup: clean orphaned E2E server and start fresh one
  globalSetup: './test/global-setup.js',
  // Global teardown: kill the E2E server
  globalTeardown: './test/global-teardown.js',
  // Shared settings for all the projects below.
  // See https://playwright.dev/docs/api/class-testoptions
  use: {
    // Maximum time each action such as `click()` or `fill()` can take.
    // Defaults to 0 (no limit).
    actionTimeout: 0,
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:3110',
    // Use storage state for authentication
    storageState: 'e2e-storage-state.json',
    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    {
      name: 'e2e',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  //   outputDir: 'test-results',

  // Server lifecycle is managed by test/global-setup.js and test/global-teardown.js
  // because on Windows, SIGTERM is not delivered to child processes, so the
  // built-in webServer cannot reliably self-terminate. globalSetup starts the
  // server as a child process and globalTeardown kills it.
};

module.exports = config;