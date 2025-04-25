/// <reference types="cypress" />

export {};

describe('Enter Address & Receive Instant Estimate', () => {
  beforeEach(() => {
    // Serve address suggestions from fixture using the new API route structure with type=suggestions
    cy.intercept('GET', '**/api/nominatim?type=suggestions&query=*', {
      fixture: 'addressSuggestions.json'
    }).as('nominatimApiCall');

    // Intercept POST requests to the log API
    cy.intercept('POST', '**/api/log', {
      statusCode: 201,
      body: { success: true, message: 'Log event stored', id: 'mock-doc-id' }
    }).as('logApiCall');

    const logEventStub = cy.stub().as('logEventSpy');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.logEvent = logEventStub;
      }
    });
  });

  it('fetches address suggestions as user types', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.wait('@nominatimApiCall');

    cy.get('ul', { timeout: 5000 })
      .should('be.visible')
      .and('contain.text', '2323, East Highland Avenue');
  });

  it('handles API failures gracefully', () => {
    cy.intercept('GET', '/api/nominatim?type=suggestions&query=*', {
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

    cy.wait(600);

    cy.get('ul').should('not.exist');
  });

  it('selects a suggestion and logs the suggestion event', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.wait('@nominatimApiCall');

    cy.contains(
      'ul li',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    )
      .should('be.visible')
      .click();

    cy.get('input[placeholder="Enter address"]').should(
      'have.value',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );

    // Match the actual format being used
    cy.get('@logEventSpy').should(
      'have.been.calledWith',
      'Address Selected',
      {
        id: 123456,
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        lat: 33.123,
        lon: -111.123,
        boundingbox: ['33.122', '33.124', '-111.124', '-111.122'],
        confirmedIntent: false
      },
      { toMixpanel: true, toFirestore: true }
    );

    // Wait for the API call to be made
    cy.wait('@logApiCall');
  });

  it('logs the intent to buy when "Get Instant Estimate" is clicked', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');

    cy.wait('@nominatimApiCall');

    cy.contains(
      'ul li',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    )
      .should('be.visible')
      .click();

    // Wait for selection process to complete
    cy.wait(500);
    cy.get('@logEventSpy').invoke('resetHistory');

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    // Match the actual format being used
    cy.get('@logEventSpy').should(
      'have.been.calledWith',
      'Request Estimate',
      {
        id: 123456,
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        lat: 33.123,
        lon: -111.123,
        boundingbox: ['33.122', '33.124', '-111.124', '-111.122'],
        confirmedIntent: true
      },
      { toMixpanel: true, toFirestore: true }
    );

    cy.wait('@logApiCall');
  });
});
