import './commands';

// Global intercepts to ensure no API calls slip through during E2E tests
// This prevents network noise, API errors, and flaky tests

beforeEach(() => {
  // Intercept all parcel metadata API calls with default mock
  cy.intercept('GET', '**/api/parcel-metadata/**', {
    fixture: 'parcels/residential_baseline.json'
  }).as('globalParcelMetadata');

  // Intercept all address lookup API calls with empty results by default
  cy.intercept('GET', '**/api/lookup**', {
    statusCode: 200,
    body: {
      query: '',
      results: [],
      count: 0
    }
  }).as('globalLookup');

  // Intercept all logging API calls to prevent noise
  cy.intercept('POST', '**/api/log**', {
    statusCode: 201,
    body: { success: true, message: 'Log event stored', id: 'mock-doc-id' }
  }).as('globalLogApi');

  // Intercept any other common API endpoints that might cause noise
  cy.intercept('GET', '**/api/**', (req) => {
    // Log unexpected API calls for debugging
    console.warn(`Unexpected API call intercepted: ${req.method} ${req.url}`);
    req.reply({
      statusCode: 200,
      body: { message: 'Mock response from global intercept' }
    });
  }).as('globalApiCatchAll');
});
