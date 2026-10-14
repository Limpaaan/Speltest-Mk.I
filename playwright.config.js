import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test/browser',
  timeout: 90000,
  workers: 1,
  // CI must expose progress even if Chromium or a worker stalls.
  reporter: process.env.CI ? 'line' : 'list',
  // SwiftShader may compile/render the first detailed scene for more than five seconds.
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: [
        '--no-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server/index.js --production',
    env: {
      PORT: '4173',
      HOST: '127.0.0.1',
      ALLOWED_ORIGIN: 'http://127.0.0.1:4173',
    },
    url: 'http://127.0.0.1:4173/health',
    reuseExistingServer: false,
  },
});
