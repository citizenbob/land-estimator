// Alias for backward compatibility during transition
export const mockSuggestions = [
  {
    displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
    label: 'Google HQ',
    lat: '37.422',
    lon: '-122.084',
    value: '1600 Amphitheatre Parkway, Mountain View, CA'
  },
  {
    displayName: '1 Infinite Loop, Cupertino, CA',
    label: 'Apple HQ',
    lat: '37.331',
    lon: '-122.031',
    value: '1 Infinite Loop, Cupertino, CA'
  }
];

export const mockGeocodeResults = [
  {
    label: '1600 Amphitheatre Parkway',
    value: '1',
    lat: '37.422',
    lon: '-122.084',
    displayName: '1600 Amphitheatre Parkway, Mountain View, CA'
  },
  {
    label: '1 Infinite Loop',
    value: '2',
    lat: '37.331',
    lon: '-122.031',
    displayName: '1 Infinite Loop, Cupertino, CA'
  },
  {
    label: 'Empire State Building',
    value: '3',
    lat: '40.748817',
    lon: '-73.985428',
    displayName: 'Empire State Building, New York, NY'
  }
];

// Common addresses used in tests
export const mockAddresses = {
  google: '1600 Amphitheatre Parkway, Mountain View, CA',
  apple: '1 Infinite Loop, Cupertino, CA',
  empire: 'Empire State Building, New York, NY',
  phoenix:
    '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
};

// Raw Nominatim API response format
export const mockNominatimResponses = [
  {
    place_id: 365107046,
    licence: 'Data © OpenStreetMap contributors, ODbL 1.0.',
    osm_type: 'way',
    osm_id: 436773192,
    lat: '37.422',
    lon: '-122.084',
    display_name: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
    address: {
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
    licence: 'Data © OpenStreetMap contributors, ODbL 1.0.',
    osm_type: 'way',
    osm_id: 225576598,
    lat: '37.331',
    lon: '-122.031',
    display_name: '1 Infinite Loop, Cupertino, CA 95014, USA',
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

// Springfield example data used in nominatimGeoCode.test.ts
export const mockSpringfieldApiResponse = [
  {
    display_name: 'Springfield, IL, USA',
    lat: '39.7817',
    lon: '-89.6501'
  },
  {
    display_name: 'Springfield, MA, USA',
    lat: '42.1015',
    lon: '-72.5898'
  }
];

export const mockSpringfieldSuggestions = [
  {
    displayName: 'Springfield, IL, USA',
    label: 'Springfield, IL, USA',
    lat: '39.7817',
    lon: '-89.6501',
    value: 'Springfield, IL, USA'
  },
  {
    displayName: 'Springfield, MA, USA',
    label: 'Springfield, MA, USA',
    lat: '42.1015',
    lon: '-72.5898',
    value: 'Springfield, MA, USA'
  }
];
