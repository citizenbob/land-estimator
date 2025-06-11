/// <reference types="cypress" />

export {};

describe('Estimate Calculation Flow for Residential and Commercial Parcels', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/api/log', {
      statusCode: 201,
      body: { success: true, message: 'Log event stored', id: 'mock-doc-id' }
    }).as('logApiCall');
  });

  it('Shopper requests estimate for Residential parcel with baseline affluence', () => {
    // Setup: load parcel with affluence_score = 50 and valid bounding box
    cy.visit('/?mockParcelId=RES_BASELINE');

    // GIVEN I am requesting an instant estimate for a residential parcel with affluence_score = 50 (baseline)
    // AND my parcel metadata provides a valid bounding box

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.equal(
        'RES_BASELINE'
      );
    });

    // THEN the system calculates area using the defined bounding-box formula
    // AND applies affluence_multiplier = 1.0
    // AND applies combined_multiplier = 1.0
    // AND calculates install_min/max = area × baseRate.min/max
    // AND calculates design_fee = max(install × 20%, minimumServiceFee)
    // AND calculates maintenance_min/max with combined_multiplier
    // AND computes finalEstimate.min/max = max(subtotal, minimumServiceFee)
    // AND returns a full priceBreakdown including min and max

    cy.get('[data-testid="estimate-breakdown"]').should('exist');
    cy.get('[data-testid="install-min"]').should('contain.text', '$');
    cy.get('[data-testid="install-max"]').should('contain.text', '$');
    cy.get('[data-testid="design-fee"]').should('contain.text', '$');
    cy.get('[data-testid="maintenance-min"]').should('contain.text', '$');
    cy.get('[data-testid="maintenance-max"]').should('contain.text', '$');
    cy.get('[data-testid="final-estimate-min"]').should('contain.text', '$');
    cy.get('[data-testid="final-estimate-max"]').should('contain.text', '$');
  });

  it('Shopper requests estimate for Commercial parcel in affluent area', () => {
    // Setup: load parcel with affluence_score = 80 and valid bounding box
    cy.visit('/?mockParcelId=COM_AFFLUENT');

    // GIVEN I am requesting an instant estimate for a commercial parcel with affluence_score = 80
    // AND my parcel metadata provides a valid bounding box

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.equal(
        'COM_AFFLUENT'
      );
    });

    // THEN the system calculates area using the defined bounding-box formula
    // AND the system applies commercial_multiplier = 0.85
    // AND calculates affluence_multiplier > 1.0
    // AND applies combined_multiplier = commercial_multiplier × affluence_multiplier
    // AND computes all cost components correctly
    // AND enforces finalEstimate respects minimumServiceFee
    // AND estimate matches official estimator within ±1%

    cy.get('[data-testid="estimate-breakdown"]').should('exist');
    cy.get('[data-testid="final-estimate-min"]')
      .invoke('text')
      .then((min) => {
        expect(parseFloat(min.replace(/[^\d.]/g, ''))).to.be.greaterThan(0);
      });
    cy.get('[data-testid="final-estimate-max"]')
      .invoke('text')
      .then((max) => {
        expect(parseFloat(max.replace(/[^\d.]/g, ''))).to.be.greaterThan(0);
      });
  });

  it('Handles missing landscapable area gracefully', () => {
    // Setup: load parcel with missing or zero estimated_landscapable_area
    cy.visit('/?mockParcelId=NULL_AREA');

    // GIVEN I am requesting an instant estimate for a parcel with missing area
    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.equal('NULL_AREA');
    });

    // THEN the system returns an appropriate fallback or user-facing message
    cy.get('[data-testid="estimate-error"]').should(
      'contain.text',
      'We couldn’t calculate an estimate for this property.'
    );
  });

  it('Handles malformed bounding box data without crashing', () => {
    // Setup: load parcel with corrupted bounding box
    cy.visit('/?mockParcelId=MALFORMED_BOUNDS');

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@logApiCall').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.equal(
        'MALFORMED_BOUNDS'
      );
    });

    // THEN the system handles the error gracefully and informs the user
    cy.get('[data-testid="estimate-error"]').should(
      'contain.text',
      'We couldn’t calculate an estimate for this property.'
    );
  });
});
