/// <reference types="cypress" />
export {};

import { useCallback } from 'react';
// Import the actual logger function
import { logEvent as actualLogEvent } from '@services/logger';

// Helper to get the logger function, allowing override via Cypress
const getLogger = () => {
  // Check if running in Cypress and if a mock logger is provided
  if (typeof window !== 'undefined' && window.Cypress && window.cypressLogger) {
    return window.cypressLogger;
  }
  // Otherwise, return the actual logger function
  return actualLogEvent;
};

export const useEventLogger = () => {
  const logEventToServices = useCallback(
    async (
      eventName: string,
      data: Record<string, unknown>,
      options?: { toMixpanel?: boolean; toFirestore?: boolean }
    ) => {
      // Use the potentially overridden logger function
      const loggerFn = getLogger();
      // Determine options with defaults
      const { toMixpanel = true, toFirestore = false } = options || {};

      try {
        // Call the logger with the single payload object
        await loggerFn({ eventName, data, toMixpanel, toFirestore });
      } catch (error) {
        console.error(`Error logging event: ${eventName}`, error);
      }
    },
    []
  );

  // Return the logEvent function for the component to use
  return { logEvent: logEventToServices };
};

// Add cypressLogger to Window interface if using TypeScript
declare global {
  interface Window {
    Cypress?: object;
    cypressLogger?: (payload: {
      eventName: string;
      data: Record<string, unknown>;
      toMixpanel?: boolean;
      toFirestore?: boolean;
    }) => Promise<void>;
    // Define the logEvent signature(s) on window
    logEvent: {
      (payload: {
        eventName: string;
        data: Record<string, unknown>;
        toMixpanel?: boolean;
        toFirestore?: boolean;
      }): void;
      (
        eventName: string,
        data: Record<string, unknown>,
        options?: { toMixpanel?: boolean; toFirestore?: boolean }
      ): void;
    };
  }
}

describe('Enter Address & Receive Instant Estimate', () => {
  beforeEach(() => {
    // Intercept API calls - Ensure mock response structure is correct
    cy.intercept('GET', '/api/nominatim*', (req) => {
      // Check if it's a suggestions request based on query params
      if (req.query.type === 'suggestions' && req.query.query) {
        // Check for the specific failure trigger if needed for the failure test
        if (req.query.fail === 'true') {
          req.reply({ statusCode: 500, body: {} });
        } else {
          // Reply with success for suggestions
          req.reply({
            statusCode: 200,
            body: [
              {
                lat: '33.123',
                lon: '-111.123',
                displayName:
                  '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
                label: '2323, East Highland Avenue',
                value:
                  '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
              }
            ]
          });
        }
      } else {
        // Let other /api/nominatim calls (like coordinates) pass through or handle differently
        req.continue();
      }
    }).as('nominatimApiCall');

    // Define the stub *before* visiting - remove .resolves()
    const logEventStub = cy.stub();

    cy.visit('/', {
      onBeforeLoad(win) {
        // Assign the stub to the custom window property
        win.cypressLogger = logEventStub;
      }
    });

    // After the page loads, access window to ensure stub is available, then alias
    cy.window()
      .its('cypressLogger')
      .should('equal', logEventStub)
      .then(() => {
        cy.wrap(logEventStub).as('logEventSpy');
      });
  });

  it('fetches address suggestions as user types', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    // Wait specifically for the suggestions API call
    cy.wait('@nominatimApiCall');

    // Assert that the suggestions list contains the expected text
    cy.get('ul', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', '2323, East Highland Avenue');
  });

  it('handles API failures gracefully', () => {
    // Intercept specifically for failure *before* the action
    cy.intercept('GET', '/api/nominatim*type=suggestions*', {
      statusCode: 500
    }).as('getNominatimSuggestionsFail');

    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('trigger failure');

    cy.wait('@getNominatimSuggestionsFail');

    cy.get('ul').should('not.exist');
    cy.get('[role="alert"]').should(
      'contain.text',
      'Error fetching suggestions'
    );
  });

  it('clears suggestions when input is empty', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.wait('@nominatimApiCall');

    cy.get('ul', { timeout: 5000 }).should('be.visible');

    cy.get('input[placeholder="Enter address"]').clear();

    // Wait for debounce + potential re-render
    cy.wait(600);

    cy.get('ul').should('not.exist');
  });

  it('selects a suggestion and logs the suggestion event', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.wait('@nominatimApiCall');

    cy.contains('ul li', '2323, East Highland Avenue')
      .should('be.visible')
      .click();

    cy.get('input[placeholder="Enter address"]').should(
      'have.value',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );

    cy.get('@logEventSpy').should('have.been.calledOnceWith', {
      eventName: 'Address Selected',
      data: {
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        lat: '33.123',
        lon: '-111.123'
      },
      toMixpanel: true,
      toFirestore: true
    });
  });

  it('logs the intent to buy when "Get Instant Estimate" is clicked', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.contains('ul li', '2323, East Highland Avenue', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.get('@logEventSpy').invoke('resetHistory');

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.get('@logEventSpy').should('have.been.calledOnceWith', {
      eventName: 'Request Estimate',
      data: {
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        lat: '33.123',
        lon: '-111.123',
        confirmedIntent: true
      },
      toMixpanel: true,
      toFirestore: true
    });
  });
});
