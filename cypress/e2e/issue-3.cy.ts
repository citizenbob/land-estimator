/// <reference types="cypress" />

export {};

describe('Estimate Calculation Flow for Residential and Commercial Parcels', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.window({ timeout: 30000 }).should((win) => {
      expect(win).to.have.property('addressIndexBothRegionsReady', true);
    });
  });

  /**
   * Scenario: User requests estimate for residential parcel
   * GIVEN the user is on the landing page
   * WHEN they enter "621 Market St" and select the suggestion
   * AND they click "Get Instant Estimate"
   * THEN the system should calculate and display an estimate
   */
  it('Should calculate estimate for 621 Market St (residential parcel)', () => {
    cy.get('input[placeholder="Enter address"]')
      .should('be.visible')
      .type('621 Market St');

    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');
    cy.get('li[role="option"]').first().click();

    cy.get('input[placeholder="Enter address"]').should(($input) => {
      const value = $input.val();
      expect(value).to.include('Market St');
    });

    cy.get('button')
      .contains('Get Instant Estimate')
      .should('be.visible')
      .click();

    cy.get('body', { timeout: 15000 }).should(($body) => {
      const text = $body.text();
      expect(text).to.satisfy((str) => str.includes('Total Estimate'));
    });
  });

  /**
   * Scenario: User requests estimate for commercial parcel
   * GIVEN the user is on the landing page
   * WHEN they enter "1195 Dunn Rd" and select the suggestion
   * AND they click "Get Instant Estimate"
   * THEN the system should calculate and display an estimate
   */
  it('Should calculate estimate for 1195 Dunn Rd (commercial parcel)', () => {
    cy.get('input[placeholder="Enter address"]')
      .should('be.visible')
      .type('1195 Dunn Rd');

    cy.get('ul[role="listbox"]', { timeout: 10000 }).should('be.visible');
    cy.get('li[role="option"]').first().click();

    cy.get('button')
      .contains('Get Instant Estimate')
      .should('be.visible')
      .click();

    cy.get('body', { timeout: 15000 }).should(($body) => {
      const text = $body.text();
      expect(text).to.satisfy((str) => str.includes('Total Estimate'));
    });
  });
});
