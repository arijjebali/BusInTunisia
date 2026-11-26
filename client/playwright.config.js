// Tests d'interface (E2E) — parcours critique BusInTunisia.
// Démarre automatiquement : l'API sur la base de test (port 5056) et le client Vite (port 5174).
import { defineConfig, devices } from '@playwright/test'

const API_PORT = 5056
const WEB_PORT = 5174

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: false,
  workers: 1, // les scénarios partagent la base de test
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }], ['junit', { outputFile: 'e2e-report/junit.xml' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    locale: 'en-GB',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node index.js',
      cwd: '../server',
      port: API_PORT,
      env: { PORT: String(API_PORT), DB_NAME: process.env.TEST_DB_NAME || 'bus_in_tunisia_test' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // Build de production servi par vite preview (le serveur de dev recharge la page quand il optimise
      // ses dépendances, ce qui rendait le premier scénario instable). preview reprend le proxy /api.
      command: `npx vite build && npx vite preview --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      env: { VITE_API_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
