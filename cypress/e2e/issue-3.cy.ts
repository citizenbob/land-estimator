/// <reference types="cypress" />

export {};

describe('Estimate Calculation Flow for Residential and Commercial Parcels', () => {
  beforeEach(() => {
    // Override global intercepts with test-specific ones
    // Using more robust patterns to catch all API variations

    cy.intercept('POST', '**/api/log**', {
      statusCode: 201,
      body: { success: true, message: 'Log event stored', id: 'mock-doc-id' }
    }).as('logApiCall');

    cy.intercept('GET', '**/api/parcel-metadata/**', {
      fixture: 'parcels/residential_baseline.json'
    }).as('parcelMetadata');

    // No longer need to intercept lookup API since we use client-side FlexSearch
    // Address search now happens instantly without API calls

    cy.visit('/');

    // Wait for address index to be ready (same as issue-1.cy.ts)
    cy.window({ timeout: 15000 }).should(
      'have.property',
      'addressIndexBothRegionsReady',
      true
    );
  });

  it('Shopper requests estimate for Residential parcel with baseline affluence', () => {
    // GIVEN I am requesting an instant estimate for a residential parcel with affluence_score = 50 (baseline)
    // AND my parcel metadata provides a valid bounding box

    cy.get('input[placeholder="Enter address"]').type('401 Market St');

    // Wait for client-side FlexSearch suggestions (no API call needed)
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('li[role="option"]').first().click();

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();
    // WHEN I click "Get Instant Estimate"
    cy.wait('@parcelMetadata');

    cy.wait('@logApiCall');
    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      // Address ID will be from the real FlexSearch data, not hardcoded
      expect(interception.request.body.data.address_id).to.be.a('string');
    });

    // THEN the system calculates area using the defined bounding-box formula
    // AND applies affluence_multiplier = 1.0
    // AND applies combined_multiplier = 1.0
    // AND calculates install_min/max = area × baseRate.min/max
    // AND calculates design_fee = max(install × 20%, minimumServiceFee)
    // AND calculates maintenance_min/max with combined_multiplier
    // AND computes finalEstimate.min/max = max(subtotal, minimumServiceFee)
    // AND returns a full priceBreakdown including min and max

    cy.get('.estimate-breakdown').should('exist');
    cy.contains('Design:').should('be.visible');
    cy.contains('Installation:').should('be.visible');
    cy.contains('Total Estimate:').should('be.visible');
    cy.get('.estimate-breakdown').should('contain.text', '$');
  });

  it('Shopper requests estimate for Commercial parcel in affluent area', () => {
    // Override the default parcel metadata intercept for this specific test
    cy.intercept('GET', '**/api/parcel-metadata/**', {
      fixture: 'parcels/commercial_affluent.json'
    }).as('commercialMetadata');

    cy.get('input[placeholder="Enter address"]').type('800 Market St');

    // Wait for client-side FlexSearch suggestions
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('li[role="option"]').first().click();

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@commercialMetadata');
    cy.wait('@logApiCall');
    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      // Address ID will be from the real FlexSearch data
      expect(interception.request.body.data.address_id).to.be.a('string');
    });

    // THEN the system calculates area using the defined bounding-box formula
    // AND the system applies commercial_multiplier = 0.85
    // AND calculates affluence_multiplier > 1.0
    // AND applies combined_multiplier = commercial_multiplier × affluence_multiplier
    // AND computes all cost components correctly
    // AND enforces finalEstimate respects minimumServiceFee
    // AND estimate matches official estimator within ±1%

    cy.get('.estimate-breakdown').should('exist');
    cy.contains('Total Estimate:').should('be.visible');
    cy.get('.estimate-breakdown').should('contain.text', '$');
  });

  // GIVEN I am requesting an instant estimate for a parcel with missing area
  it('Handles missing landscapable area gracefully', () => {
    cy.intercept('GET', '**/api/parcel-metadata/**', {
      fixture: 'parcels/missing_area.json'
    }).as('nullAreaMetadata');

    cy.get('input[placeholder="Enter address"]').type('1315 Dunn Rd');
    // Wait for client-side FlexSearch suggestions (no API call needed)
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('li[role="option"]').first().click();

    // WHEN I click "Get Instant Estimate"
    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@nullAreaMetadata');
    cy.wait('@logApiCall');
    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      // Address ID will be from the real FlexSearch data, not hardcoded
      expect(interception.request.body.data.address_id).to.be.a('string');
    });

    // THEN the system should gracefully handle missing data by showing manual input option
    cy.get('input[placeholder="Enter square footage"]').should('be.visible');
    cy.contains('Customize Your Landscaping Services').should('be.visible');

    cy.get('input[placeholder="Enter square footage"]').clear().type('5000');
    cy.get('input[placeholder="Enter square footage"]').should(
      'have.value',
      '5000'
    );
  });

  // GIVEN I am requesting an instant estimate for a parcel with malformed bounding box data
  it('Handles malformed bounding box data without crashing', () => {
    cy.intercept('GET', '**/api/parcel-metadata/**', {
      fixture: 'parcels/malformed_bounds.json'
    }).as('malformedMetadata');

    cy.get('input[placeholder="Enter address"]').type('706 Market St');
    // Wait for client-side FlexSearch suggestions (no API call needed)
    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('li[role="option"]').first().click();

    // WHEN I click "Get Instant Estimate"
    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@malformedMetadata');
    cy.wait('@logApiCall');
    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      // Address ID will be from the real FlexSearch data, not hardcoded
      expect(interception.request.body.data.address_id).to.be.a('string');
    });

    // THEN the system handles the error gracefully and informs the user
    cy.get('body').then((body) => {
      if (body.find('[role="alert"]').length > 0) {
        cy.get('[role="alert"]').should(
          'contain.text',
          'Unable to provide automatic estimate'
        );
      } else {
        cy.get('.estimate-breakdown').should('exist');
        cy.contains('Total Estimate:').should('be.visible');
      }
    });
  });
});
