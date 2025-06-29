/// <reference types="cypress" />

// Export empty object to make this a module
export {};

// TypeScript declarations for custom commands
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log API intercepts for debugging
       */
      logIntercepts(): Chainable<void>;

      /**
       * Custom command to wait for all common API calls to complete
       */
      waitForApiCalls(): Chainable<void>;
    }
  }
}

// Custom command to log API intercepts for debugging
Cypress.Commands.add('logIntercepts', () => {
  cy.window().then((win) => {
    // Log all active intercepts to console for debugging
    console.log('Active Cypress intercepts:', {
      timestamp: new Date().toISOString(),
      userAgent: win.navigator.userAgent,
      url: win.location.href
    });
  });
});

// Custom command to wait for all common API calls to complete
Cypress.Commands.add('waitForApiCalls', () => {
  // Wait for the most common API calls with reasonable timeouts
  cy.wait('@lookup', { timeout: 5000 }).then(() => {
    cy.log('✅ Lookup API call completed');
  });

  cy.wait('@parcelMetadata', { timeout: 5000 }).then(() => {
    cy.log('✅ Parcel metadata API call completed');
  });

  cy.wait('@logApiCall', { timeout: 5000 }).then(() => {
    cy.log('✅ Log API call completed');
  });
});
