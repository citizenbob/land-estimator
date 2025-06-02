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

    // Since the estimation is done client-side, we don't need to intercept API calls
    // But we'll keep this for future reference if the implementation changes
    cy.intercept('GET', '**/api/estimate*', {
      statusCode: 200,
      body: {
        lotSizeSqFt: 7500,
        baseRatePerSqFt: { min: 4.5, max: 12 },
        designFee: 900,
        installationCost: 45000,
        maintenanceMonthly: 200,
        subtotal: { min: 33750, max: 90000 },
        minimumServiceFee: 400,
        finalEstimate: { min: 33750, max: 90000 }
      }
    }).as('estimateApiCall');

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

    // Match the new typed analytics format
    cy.get('@logEventSpy').should(
      'have.been.calledWith',
      'address_selected',
      {
        query: '2323 E Highland Ave',
        address_id: '123456',
        position_in_results: 0
      }
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

    // Match the new typed analytics format
    cy.get('@logEventSpy').should(
      'have.been.calledWith',
      'estimate_button_clicked',
      {
        address_id: '123456'
      }
    );

    cy.wait('@logApiCall');
  });

  it('displays calculation results after selecting an address and requesting an estimate', () => {
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

    // Click the Get Instant Estimate button
    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    // Wait for the API call to be logged
    cy.wait('@logApiCall');

    // Use a longer timeout and wait for the calculator container to be visible
    cy.get('[class*="EstimateCalculator-styles__CalculatorContainer"]', {
      timeout: 10000
    }).should('be.visible');

    // Check the title is displayed
    cy.contains('Customize Your Landscaping Services', {
      timeout: 10000
    }).should('be.visible');

    // Check for the lot size display with more flexible matching
    // Sometimes the specific formatting might vary, so we'll just check for "sq ft"
    cy.contains('Lot Size:').should('be.visible');
    cy.contains('sq ft').should('be.visible');

    // Check the service options are available (3 checkboxes: design, installation, maintenance)
    cy.get('input[type="checkbox"]').should('have.length.at.least', 3);

    // Verify that Design and Installation are selected by default
    cy.contains('Design')
      .parent()
      .find('input[type="checkbox"]')
      .should('be.checked');
    cy.contains('Installation')
      .parent()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Check that design and installation costs are displayed by default
    cy.contains('Design:').should('be.visible');
    cy.contains('Installation:').should('be.visible');

    // Total estimate should be displayed
    cy.contains('Total Estimate:').should('be.visible');

    // Check that maintenance is not displayed initially (since not selected by default)
    cy.contains('Maintenance:').should('not.exist');

    // Select maintenance option by clicking its label
    cy.contains('Maintenance').click();

    // Wait for animations to complete and maintenance cost to appear
    // Use should('exist') first to ensure the element appears before checking content
    cy.contains('Maintenance:').should('exist');
    cy.contains('/ month').should('be.visible');

    // Verify disclaimer is shown
    cy.contains(/Estimate range is based on typical landscaping costs/i).should(
      'be.visible'
    );
  });
});
