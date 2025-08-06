import './commands';

// Allow real API calls for E2E tests to work with actual data
// Only intercept logging API calls to prevent noise

beforeEach(() => {
  cy.intercept('POST', '**/api/log**', {
    statusCode: 201,
    body: { success: true, message: 'Log event stored', id: 'mock-doc-id' }
  }).as('globalLogApi');
});
