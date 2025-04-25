// cypress/e2e/nominatim-api.cy.ts
describe('Nominatim API Route', () => {
  beforeEach(() => {
    // Mock the external API calls
    cy.intercept('GET', '**/nominatim.openstreetmap.org/search*', {
      fixture: 'nominatimResponse.json'
    }).as('externalNominatimCall');

    // Visit the homepage with failOnStatusCode false to avoid test failures due to server issues
    cy.visit('/', { failOnStatusCode: false });
  });

  describe('Coordinates endpoint', () => {
    it('returns coordinates for a valid address', () => {
      cy.request({
        url: '/api/nominatim',
        qs: {
          type: 'coordinates',
          address: '1600 Amphitheatre Parkway, Mountain View, CA'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('place_id');
        expect(response.body).to.have.property('display_name');
      });
    });

    it('returns 400 when address is missing', () => {
      cy.request({
        url: '/api/nominatim',
        qs: { type: 'coordinates' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('Invalid address parameter');
      });
    });
  });

  describe('Suggestions endpoint', () => {
    it('returns suggestions for a valid query', () => {
      cy.request({
        url: '/api/nominatim',
        qs: {
          type: 'suggestions',
          query: 'Mountain View'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        if (response.body.length > 0) {
          const firstSuggestion = response.body[0];
          expect(firstSuggestion).to.have.property('place_id');
          expect(firstSuggestion).to.have.property('display_name');
        }
      });
    });

    it('returns 400 when query is missing', () => {
      cy.request({
        url: '/api/nominatim',
        qs: { type: 'suggestions' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('Invalid query parameter');
      });
    });
  });

  describe('Invalid requests', () => {
    it('returns 400 when type is missing', () => {
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
