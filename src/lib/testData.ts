export const mockSuggestions = [
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

export const mockNominatimResponses = [
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

export const mockNominatimResponse = {
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

export const mockNominatimError = {
  message: 'Service temporarily unavailable',
  status: 503
};
