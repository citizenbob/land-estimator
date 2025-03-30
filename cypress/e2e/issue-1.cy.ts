/// <reference types="cypress" />
export {};

declare global {
  interface Window {
    logEvent: {
      (event: { eventName: string; data: Record<string, unknown> }): void;
      (eventName: string, data: Record<string, unknown>): void;
    };
  }
}

describe('Enter Address & Receive Instant Estimate', () => {
  beforeEach(() => {
    cy.intercept(
      'GET',
      'https://nominatim.openstreetmap.org/search?*',
      (req) => {
        req.reply({
          statusCode: 200,
          body: [
            {
              lat: '33.123',
              lon: '-111.123',
              display_name:
                '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
              address: {
                house_number: '2323',
                road: 'East Highland Avenue',
                neighborhood: 'Biltmore',
                city: 'Phoenix',
                county: 'Maricopa County',
                state: 'Arizona',
                postcode: '85016',
                country: 'United States'
              }
            }
          ]
        });
      }
    ).as('getNominatimSuggestions');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.logEvent = () => {};
      }
    }).then((win) => {
      cy.stub(win, 'logEvent').as('logEventSpy');
    });
  });

  it('fetches address suggestions as user types', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');
    cy.wait('@getNominatimSuggestions');
    cy.get('ul', { timeout: 5000 }).should(
      'contain.text',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );
  });

  it('handles API failures gracefully', () => {
    cy.intercept('GET', 'https://nominatim.openstreetmap.org/search?*', {
      statusCode: 500
    }).as('getNominatimSuggestionsFail');

    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');
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
    cy.wait('@getNominatimSuggestions');
    cy.get('ul', { timeout: 5000 }).should(
      'contain.text',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    );
    cy.get('input[placeholder="Enter address"]').clear();
    cy.wait(600);
    cy.get('ul').should('not.exist');
  });

  it('selects a suggestion and logs the suggestion event', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');
    cy.wait('@getNominatimSuggestions');
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
    cy.get('@logEventSpy').should('have.been.calledWith', {
      eventName: 'Address Matched',
      data: {
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        confirmedIntent: false
      }
    });
  });

  it('logs the intent to buy when "Get Instant Estimate" is clicked', () => {
    cy.get('input[placeholder="Enter address"]')
      .clear()
      .type('2323 E Highland Ave');
    cy.wait('@getNominatimSuggestions');
    cy.contains(
      'ul li',
      '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
    )
      .should('be.visible')
      .click();
    cy.get('@logEventSpy').invoke('resetHistory');
    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();
    cy.get('@logEventSpy').should('have.been.calledWith', {
      eventName: 'Request Estimate',
      data: {
        address:
          '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States',
        confirmedIntent: true
      }
    });
  });
});
