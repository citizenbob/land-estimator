import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'pnubv4',
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    // Reduce noise and improve reliability
    video: false,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,

    // Timeouts and retries for better reliability
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    // Retry failed tests in CI
    retries: {
      runMode: 2,
      openMode: 0
    },

    // Reduce browser console noise
    env: {
      hideXHRInCommandLog: true
    },

    setupNodeEvents(on, config) {
      // Suppress unnecessary Node.js warnings during tests
      on('task', {
        log(message) {
          console.log(message);
          return null;
        }
      });

      // Filter out noisy browser console logs
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-logging');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');
          launchOptions.args.push('--log-level=3');
        }
        return launchOptions;
      });

      return config;
    }
  }
});
