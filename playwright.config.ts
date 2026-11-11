import { defineConfig } from '@playwright/test';

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

// Expects a prior `pnpm build`: the preview serves dist/ and the search needs the pagefind index.
// Uses the installed Google Chrome everywhere, so no browser download is needed. GitHub's Ubuntu runners
// ship Chrome with its system libraries, which keeps CI off the apt mirrors that `--with-deps` needs.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Bounded on CI so a broken environment fails fast and visibly instead of retrying every test
  maxFailures: process.env.CI ? 5 : 0,
  globalTimeout: process.env.CI ? 10 * 60 * 1000 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    channel: 'chrome',
    locale: 'pt-BR',
    trace: 'on-first-retry',
  },
  // CI starts the preview itself (see ci.yml): Playwright could not stop the pnpm-wrapped server
  // on Linux, so the run hung after the last test and never printed its summary
  webServer: process.env.CI
    ? undefined
    : {
      command: `pnpm astro preview --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: true,
    },
});
