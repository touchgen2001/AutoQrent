import { defineConfig } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const requestedWorkers = Number(process.env.PLAYWRIGHT_MAX_WORKERS || '1')
const workers = Number.isFinite(requestedWorkers) && requestedWorkers > 0
  ? requestedWorkers
  : 1
const retries = Number(process.env.PLAYWRIGHT_RETRIES || (isCI ? '1' : '0'))
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE === 'dev' ? 'dev' : 'prod'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries,
  workers,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: serverMode === 'prod'
          ? 'pnpm start -- -p 3000 -H 127.0.0.1'
          : 'pnpm next dev --webpack -p 3000 -H 127.0.0.1',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
