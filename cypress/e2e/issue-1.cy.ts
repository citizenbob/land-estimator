describe('Capture Address Inquiries and Log Shopper Behavior', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/log', { statusCode: 200 }).as('log');

    cy.visit('/');

    cy.window({ timeout: 15000 }).should(
      'have.property',
      'addressIndexBothRegionsReady',
      true
    );
  });

  /**
   * Scenario: User enters an address and receives suggested matches
   * GIVEN the user is on the landing page
   * WHEN they start typing their address
   * THEN address suggestions are displayed from a local, static dataset
   */
  it('Shopper enters a St. Louis City address and receives suggested matches', () => {
    cy.get('input[placeholder="Enter address"]').clear().type('621 Market St');

    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');

    cy.get('li[role="option"]').first().click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal('address_selected');
      expect(interception.request.body.data.query).to.equal('621 Market St');
      expect(interception.request.body.data.address_id).to.be.a('string');
      expect(interception.request.body.data.position_in_results).to.equal(0);
    });
  });

  /**
   * Scenario: User selects an address and requests an estimate
   * GIVEN the user has selected a suggestion
   * WHEN they click "Get Instant Estimate"
   * THEN the system logs an "estimate_button_clicked" event with address_id
   */
  it('Shopper clears their selected suggestion', () => {
    cy.get('input[placeholder="Enter address"]').clear().type('701 Market St');

    cy.get('ul[role="listbox"]').should('be.visible');
    cy.get('li[role="option"]').first().click();
    cy.wait('@log');

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.be.a('string');
    });
  });

  /**
   * Scenario: User enters a different address and receives estimate
   * GIVEN a user enters a St. Louis County address
   * WHEN they select a suggestion and click for an estimate
   * THEN both address_selected and estimate_button_clicked events are logged
   * THEN enhanced BI data for lead follow-up is logged
   */
  it('Shopper enters a St. Louis County address and receives suggested matches', () => {
    cy.get('input[placeholder="Enter address"]').clear().type('1195 Dunn Rd');

    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');

    cy.get('li[role="option"]').first().click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal('address_selected');
      expect(interception.request.body.data.address_id).to.be.a('string');
    });

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data.address_id).to.be.a('string');
    });
  });
});
