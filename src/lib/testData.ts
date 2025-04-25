export const MOCK_SUGGESTIONS = [
  {
    place_id: 365107046,
    display_name:
      '1600 Amphitheatre Parkway, San Fernando Valley, Mountain View, CA, USA'
  },
  {
    place_id: 159616984,
    display_name: '1 Infinite Loop, Cupertino County, Cupertino, CA 95014, USA'
  }
];

// Common test locations
export const TEST_LOCATIONS = {
  GOOGLE: '1600 Amphitheatre Parkway, Mountain View, CA',
  APPLE: '1 Infinite Loop, Cupertino, CA',
  MICROSOFT: 'One Microsoft Way, Redmond, WA',
  FACEBOOK: '1 Hacker Way, Menlo Park, CA'
};

export const TEST_COORDINATES = {
  GOOGLE: { lat: '37.422', lon: '-122.084' },
  APPLE: { lat: '37.331', lon: '-122.031' },
  MICROSOFT: { lat: '47.639', lon: '-122.131' },
  FACEBOOK: { lat: '37.484', lon: '-122.148' }
};

export const MOCK_NOMINATIM_RESPONSES = [
  {
    place_id: 365107046,
    license: 'Data © OpenStreetMap contributors, ODbL 1.0.',
    osm_type: 'way',
    osm_id: 436773192,
    lat: '37.422',
    lon: '-122.084',
    boundingbox: ['37.4215', '37.4225', '-122.0845', '-122.0835'],
    display_name:
      '11600 Amphitheatre Parkway, San Fernando Valley, Mountain View, CA, USA',
    address: {
      house_number: '1600',
      road: 'Amphitheatre Parkway',
      city: 'Mountain View',
      state: 'California',
      postcode: '94043',
      country: 'United States',
      country_code: 'us'
    }
  },
  {
    place_id: 159616984,
    license: 'Data © OpenStreetMap contributors, ODbL 1.0.',
    osm_type: 'way',
    osm_id: 225576598,
    lat: '37.331',
    lon: '-122.031',
    display_name: '1 Infinite Loop, Cupertino County, Cupertino, CA 95014, USA',
    boundingbox: ['37.3305', '37.3315', '-122.0315', '-122.0305'],
    address: {
      house_number: '1',
      road: 'Infinite Loop',
      city: 'Cupertino',
      state: 'California',
      postcode: '95014',
      country: 'United States',
      country_code: 'us'
    }
  }
];

export const MOCK_NOMINATIM_RESPONSE = {
  place_id: 365107046,
  licence: 'Data © OpenStreetMap contributors, ODbL 1.0.',
  osm_type: 'way',
  osm_id: 436773192,
  lat: '37.422',
  lon: '-122.084',
  display_name:
    '11600 Amphitheatre Parkway, San Fernando Valley, Mountain View, CA, USA',
  boundingbox: ['37.3305', '37.3315', '-122.0315', '-122.0305'],
  address: {
    house_number: '1600',
    road: 'Amphitheatre Parkway',
    city: 'Mountain View',
    state: 'California',
    postcode: '94043',
    country: 'United States',
    country_code: 'us'
  }
};

// Standardized error responses for different scenarios
export const MOCK_NOMINATIM_ERRORS = {
  SERVICE_UNAVAILABLE: {
    message: 'Service temporarily unavailable',
    status: 503
  },
  NOT_FOUND: {
    message: 'Address not found',
    status: 404
  },
  RATE_LIMIT: {
    message: 'Rate limit exceeded',
    status: 429
  },
  SERVER_ERROR: {
    message: 'Internal server error',
    status: 500
  },
  NETWORK_ERROR: new Error('Network connection failed')
};

// Legacy export to maintain backward compatibility
export const MOCK_NOMINATIM_ERROR = MOCK_NOMINATIM_ERRORS.SERVICE_UNAVAILABLE;
