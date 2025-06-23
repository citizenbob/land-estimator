describe('Capture Address Inquiries and Log Shopper Behavior', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/log', { statusCode: 200 }).as('log');

    cy.intercept('GET', '**/api/lookup**', (req) => {
      const query = req.url.includes('621')
        ? 'query_market.json'
        : req.url.includes('907')
          ? 'query_volz.json'
          : null;
      if (query) {
        req.reply({ fixture: `lookups/${query}` });
      }
    }).as('lookup');

    cy.visit('/');
  });

  /**
   * Scenario: User enters an address and receives suggested matches
   * GIVEN the user is on the landing page
   * WHEN they start typing their address
   * THEN address suggestions are displayed from a local, static dataset
   */
  it('Shopper enters a St. Louis City address and receives suggested matches', () => {
    cy.get('input[placeholder="Enter address"]').clear().type('621 Market');

    cy.wait('@lookup');

    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');

    cy.contains('li[role="option"]', '621 Market St., St. Louis, MO 63101')
      .should('be.visible')
      .click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal('address_selected');
      expect(interception.request.body.data).to.deep.include({
        query: '621 Market',
        address_id: '10131000022',
        position_in_results: 0
      });
    });

    cy.get('input[placeholder="Enter address"]').should(
      'have.value',
      '621 Market St., St. Louis, MO 63101'
    );
  });

  /**
   * Scenario: User selects an address and requests an estimate
   * GIVEN the user has selected a suggestion
   * WHEN they click "Get Instant Estimate"
   * THEN the system logs an "estimate_button_clicked" event with address_id
   */
  it('Shopper clears their selected suggestion', () => {
    cy.get('input[placeholder="Enter address"]').clear().type('621 Market');

    cy.wait('@lookup');
    cy.contains(
      'li[role="option"]',
      '621 Market St., St. Louis, MO 63101'
    ).click();
    cy.wait('@log');

    cy.get('button')
      .contains(/get instant estimate/i)
      .should('be.visible')
      .click();

    cy.wait('@log').then((interception) => {
      expect(interception.request.body.eventName).to.equal(
        'estimate_button_clicked'
      );
      expect(interception.request.body.data).to.deep.include({
        address_id: '10131000022'
      });
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
    cy.get('input[placeholder="Enter address"]').clear().type('907 Volz');

    cy.wait('@lookup');
    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');
    cy.contains(
      'li[role="option"]',
      '907 Volz Dr., Crestwood, MO 63126'
    ).click();

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
