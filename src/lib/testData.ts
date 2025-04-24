export const mockSuggestions = [
  {
    lat: '37.4224428',
    lon: '-122.0842467',
    displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
    label: 'Google HQ',
    value: '1600 Amphitheatre Parkway, Mountain View, CA'
  },
  {
    lat: '37.3318',
    lon: '-122.0312',
    displayName: '1 Infinite Loop, Cupertino, CA',
    label: 'Apple HQ',
    value: '1 Infinite Loop, Cupertino, CA'
  }
];

export const mockGeocodeResults = [
  {
    lat: '37.4224428',
    lon: '-122.0842467',
    displayName: '1600 Amphitheatre Parkway, Mountain View, CA',
    label: 'Google HQ',
    value: '1'
  },
  {
    lat: '37.3318',
    lon: '-122.0312',
    displayName: '1 Infinite Loop, Cupertino, CA',
    label: 'Apple HQ',
    value: '2'
  },
  {
    lat: '47.6205',
    lon: '-122.3493',
    displayName: '410 Terry Ave N, Seattle, WA',
    label: 'Amazon HQ',
    value: '3'
  }
];

export const mockAddresses = {
  google: '1600 Amphitheatre Parkway, Mountain View, CA',
  apple: '1 Infinite Loop, Cupertino, CA',
  amazon: '410 Terry Ave N, Seattle, WA',
  phoenix:
    '2323, East Highland Avenue, Biltmore, Phoenix, Maricopa County, Arizona, 85016, United States'
};

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

export const mockNominatimResponse = {
  place_id: 259127396,
  licence:
    'Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright',
  osm_type: 'relation',
  osm_id: 186579,
  boundingbox: ['42.0956247', '42.1173678', '-72.6463336', '-72.5708079'],
  lat: '42.1070555',
  lon: '-72.5906541',
  display_name: 'Springfield, Hampden County, Massachusetts, United States',
  class: 'boundary',
  type: 'administrative',
  importance: 0.7908560628085912
};

export const mockNominatimError = {
  message: 'Service temporarily unavailable',
  status: 503
};

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

export const mockSpringfieldCoordinates = {
  lat: '42.1070555',
  lon: '-72.5906541'
};
