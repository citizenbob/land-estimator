// cypress/e2e/nominatim-api.cy.ts
describe('Nominatim API Route', () => {
  context('Coordinates endpoint', () => {
    it('returns coordinates for a valid address', () => {
      cy.intercept('GET', '**/nominatim.openstreetmap.org/search*', {
        fixture: 'nominatimResponse.json'
      }).as('nominatimRequest');

      cy.visit('/');
      cy.request(
        '/api/nominatim?type=coordinates&address=1600+Amphitheatre+Parkway'
      ).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('lat');
        expect(response.body).to.have.property('lon');
        expect(response.body).to.have.property('displayName');
        expect(response.body).to.have.property('value');
      });
    });

    it('returns 400 when address is missing', () => {
      cy.visit('/');
      cy.request({
        url: '/api/nominatim?type=coordinates',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('Invalid address parameter');
      });
    });
  });

  context('Suggestions endpoint', () => {
    it('returns suggestions for a valid query', () => {
      cy.intercept('GET', '**/nominatim.openstreetmap.org/search*', {
        fixture: 'nominatimResponse.json'
      }).as('nominatimRequest');

      cy.visit('/');
      cy.request('/api/nominatim?type=suggestions&query=New+York').then(
        (response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
          if (response.body.length > 0) {
            const firstSuggestion = response.body[0];
            expect(firstSuggestion).to.have.property('displayName');
            expect(firstSuggestion).to.have.property('lat');
            expect(firstSuggestion).to.have.property('lon');
            expect(firstSuggestion).to.have.property('value');
          }
        }
      );
    });

    it('returns 400 when query is missing', () => {
      cy.visit('/');
      cy.request({
        url: '/api/nominatim?type=suggestions',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('Invalid query parameter');
      });
    });
  });

  context('Invalid requests', () => {
    it('returns 400 when type is missing', () => {
      cy.visit('/');
      cy.request({
        url: '/api/nominatim',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('Invalid type parameter');
      });
    });
  });
});
