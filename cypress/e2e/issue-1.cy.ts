describe('Enter Address & Receive Instant Estimate', () => {
  beforeEach(() => {
    // Visit the home page where the Address Input component is rendered
    cy.visit('/');
  });

  it('displays the address input field and a submit button', () => {
    // Verify that the input field and submit button exist
    cy.get('input[placeholder="Enter address"]').should('exist');
    cy.contains('button', 'Submit').should('exist');
  });

  // it('submits a valid address and receives an instant estimate', () => {
  //   // Stub the API call that would return the estimate
  //   // Adjust the URL and response as needed based on your implementation
  //   cy.intercept('POST', '/api/estimate', {
  //     statusCode: 200,
  //     body: { estimate: '$250,000' },
  //   }).as('getEstimate');

  //   // Simulate user entering an address
  //   const testAddress = '123 Main St';
  //   cy.get('input[placeholder="Enter address"]').type(testAddress);

  //   // Simulate clicking the submit button
  //   cy.contains('button', 'Submit').click();

  //   // Wait for the API call and check for a successful response
  //   cy.wait('@getEstimate').its('response.statusCode').should('eq', 200);

  //   // Verify that the instant estimate is displayed on the page
  //   cy.contains('250,000').should('exist');
  // });

  // it('handles invalid addresses gracefully', () => {
  //   // Optionally, stub an API error response for invalid addresses
  //   cy.intercept('POST', '/api/estimate', {
  //     statusCode: 400,
  //     body: { error: 'Invalid address' },
  //   }).as('invalidEstimate');

  //   // Simulate entering an invalid address
  //   cy.get('input[placeholder="Enter address"]').clear().type('!!!???');

  //   // Simulate clicking submit
  //   cy.contains('button', 'Submit').click();

  //   // Wait for the API call and verify error handling
  //   cy.wait('@invalidEstimate').its('response.statusCode').should('eq', 400);

  //   // Verify that an error message is shown
  //   cy.contains('Invalid address').should('exist');
  // });
});
