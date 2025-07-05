/**
 * @fileoverview Mock data and test fixtures for testing address lookup and estimation functionality
 */

import type { FlexSearchIndexBundle } from '@app-types';
import { vi } from 'vitest';
import type { LocalAddressRecord, AddressSuggestion } from '@app-types';
import type { VersionManifest } from '@services/versionManifest';

/**
 * Mock local address records for testing address lookup functionality
 */
export const MOCK_LOCAL_ADDRESSES: LocalAddressRecord[] = [
  {
    id: '10001000005',
    full_address: '626 1st, St. Louis, MO 63103',
    region: 'St. Louis City',
    latitude: 4278231.181849,
    longitude: 744902.380139,
    calc: {
      landarea: 7143.04,
      building_sqft: 0.0,
      estimated_landscapable_area: 6071.58,
      property_type: 'unknown'
    },
    owner: {
      name: 'CITY OF ST LOUIS'
    },
    affluence_score: 0.25,
    source_file: 'saint_louis_city-optimized.json',
    processed_date: '2025-06-11T19:25:52.542814'
  },
  {
    id: '10D530151',
    full_address:
      '11308 Dunn View Dr., St. Louis County (Unincorporated), MO 63102',
    region: 'Unincorporated',
    latitude: 4294879.84416,
    longitude: 743862.085717,
    calc: {
      landarea: 15051.81435199549,
      building_sqft: 2830.0,
      estimated_landscapable_area: 11214.31,
      property_type: 'unknown'
    },
    owner: {
      name: 'EDWARDS BRAD & VANESSA T/E'
    },
    affluence_score: 2.75,
    source_file: 'Unknown',
    processed_date: '2025-06-11T19:25:54.225408'
  },
  {
    id: '25L440198',
    full_address: '907 Volz Dr, Crestwood, MO 63126',
    region: 'Crestwood',
    latitude: 4271623.637581,
    longitude: 728460.487376,
    calc: {
      landarea: 9105.61,
      building_sqft: 1250.0,
      estimated_landscapable_area: 7605.61,
      property_type: 'unknown'
    },
    owner: {
      name: 'DUEBELBEIS THOMAS P ETAL J/T'
    },
    affluence_score: 3.25,
    source_file: 'saint_louis_county-optimized.json',
    processed_date: '2025-06-11T19:25:53.685665'
  }
];

/**
 * Mock address suggestions for testing autocomplete functionality
 */
export const MOCK_SUGGESTIONS: AddressSuggestion[] = [
  {
    place_id: '10001000005',
    display_name: '626 1st, St. Louis, MO 63103'
  },
  {
    place_id: '10D530151',
    display_name:
      '11308 Dunn View Dr., St. Louis County (Unincorporated), MO 63102'
  },
  {
    place_id: '25L440198',
    display_name: '907 Volz Dr, Crestwood, MO 63126'
  }
];

/**
 * Test location constants for consistent address testing
 */
export const TEST_LOCATIONS = {
  FIRST_STREET: '626 1st, St. Louis, MO 63103',
  DUNN_VIEW: '11308 Dunn View Dr., St. Louis County (Unincorporated), MO 63102',
  SPRING_GARDEN: '600 Spring Garden, St. Louis, MO 63108',
  PARTIAL_SEARCH: '1st street',
  VOLZ_DRIVE: '907 Volz Dr, Crestwood, MO 63126'
};

/**
 * Test coordinate data corresponding to test locations
 */
export const TEST_COORDINATES = {
  FIRST_STREET: { lat: 4278231.181849, lon: 744902.380139 },
  DUNN_VIEW: { lat: 4294879.84416, lon: 743862.085717 },
  VOLZ_DRIVE: { lat: 4271623.637581, lon: 728460.487376 }
};

/**
 * Pre-selected mock address data for consistent testing
 */
export const MOCK_ADDRESS_DATA = MOCK_LOCAL_ADDRESSES.find(
  (address) => address.id === '25L440198'
)!;

/**
 * Mock FlexSearch address lookup data
 */
export const MOCK_ADDRESS_LOOKUP_DATA = [
  {
    id: '19115000300',
    display_name: '9015 RIVERVIEW, ST. LOUIS CITY, MO',
    region: 'ST. LOUIS CITY',
    normalized: '9015 riverview st louis city mo'
  },
  {
    id: '19119000030',
    display_name: '10176 LOOKAWAY, ST. LOUIS CITY, MO',
    region: 'ST. LOUIS CITY',
    normalized: '10176 lookaway st louis city mo'
  },
  {
    id: '29001000100',
    display_name: '123 MAIN STREET, ST. LOUIS COUNTY, MO',
    region: 'ST. LOUIS COUNTY',
    normalized: '123 main street st louis county mo'
  },
  {
    id: '29001000200',
    display_name: '456 MAPLE AVE, ST. LOUIS COUNTY, MO',
    region: 'ST. LOUIS COUNTY',
    normalized: '456 maple ave st louis county mo'
  }
];

/**
 * Mock address index precomputed data
 */
export const MOCK_ADDRESS_INDEX_INDEX_DATA = {
  parcelIds: ['12345', '67890', '11111'],
  searchStrings: [
    '123 Main St, St. Louis City, MO 12345',
    '456 Oak Ave, St. Louis County, MO 67890',
    '789 Elm Dr, St. Louis City, MO 11111'
  ],
  timestamp: '2025-06-18T10:00:00.000Z',
  recordCount: 3,
  version: '3.0',
  exportMethod: 'index_optimized'
};

/**
 * Mock address data for address index loader tests
 */
export const MOCK_ADDRESS_INDEX_ADDRESS_DATA = {
  '12345': '123 Main St, St. Louis City, MO',
  '67890': '456 Oak Ave, St. Louis County, MO',
  '11111': '789 Elm Dr, St. Louis City, MO'
};

/**
 * Mock landscape estimator test data
 */
export const MOCK_PRICE_BREAKDOWN = {
  lotSizeSqFt: 10000,
  baseRatePerSqFt: { min: 4.5, max: 12 },
  designFee: 900,
  installationCost: 82500,
  maintenanceMonthly: 0,
  subtotal: { min: 45000, max: 120000 },
  minimumServiceFee: 400,
  finalEstimate: { min: 45000, max: 120000 }
};

/**
 * Mock enriched address data for estimator tests
 */
export const MOCK_ENRICHED_ADDRESS_DATA = {
  place_id: '12345',
  display_name: '1234 Test Street, City, State, 12345',
  latitude: 37.7749,
  longitude: -122.4194,
  region: 'Missouri',
  calc: {
    landarea: 10000,
    building_sqft: 2000,
    estimated_landscapable_area: 8000,
    property_type: 'residential' as const
  },
  affluence_score: 75
};

/**
 * Mock Nominatim fallback data
 */
export const MOCK_NOMINATIM_FALLBACK_DATA = {
  place_id: '67890',
  display_name: '5678 Another Street, City, State, 12345',
  latitude: 37.775,
  longitude: -122.4195,
  region: 'Unknown',
  calc: {
    landarea: 0,
    building_sqft: 0,
    estimated_landscapable_area: 0,
    property_type: 'unknown' as const
  },
  affluence_score: 0
};

/**
 * Simple mock address record for basic tests
 */
export const MOCK_SIMPLE_ADDRESS_RECORD = {
  id: '1',
  full_address: '123 Main St',
  region: 'Downtown',
  latitude: 38.627,
  longitude: -90.199,
  calc: {
    landarea: 5000,
    building_sqft: 1500,
    estimated_landscapable_area: 3500,
    property_type: 'residential' as const
  },
  owner: {
    name: 'John Doe'
  },
  affluence_score: 75,
  source_file: 'mock.json',
  processed_date: '2025-06-12T00:00:00.000Z'
};

/**
 * Mock bounding box data for landscape estimator tests
 */
export const MOCK_BOUNDING_BOXES = {
  ONE_ACRE: {
    lat_min: 38.627,
    lat_max: 38.637,
    lon_min: -90.199,
    lon_max: -90.189
  },
  SMALL_AREA: {
    lat_min: 38.627,
    lat_max: 38.629,
    lon_min: -90.199,
    lon_max: -90.197
  },
  TINY_AREA: {
    lat_min: 38.627,
    lat_max: 38.627,
    lon_min: -90.199,
    lon_max: -90.199
  }
};

/**
 * Mock analytics events for testing
 */
export const MOCK_ANALYTICS_EVENTS = {
  ADDRESS_SELECTED: {
    query: 'test query',
    address_id: 'test_id',
    position_in_results: 0
  },
  ESTIMATE_BUTTON_CLICKED: {
    address_id: 'test_id'
  }
};

/**
 * Mock parcel metadata for testing parcel services
 */
export const MOCK_PARCEL_METADATA = [
  {
    id: 'p1',
    full_address: '123 Test St',
    latitude: 10,
    longitude: 20,
    region: 'TestRegion',
    calc: {
      landarea: 100,
      building_sqft: 50,
      estimated_landscapable_area: 80,
      property_type: 'residential'
    },
    owner: {
      name: 'Test Owner'
    },
    affluence_score: 75,
    source_file: 'file1',
    processed_date: '2025-01-01'
  },
  {
    id: 'p2',
    full_address: '456 Test Ave',
    latitude: -5,
    longitude: 30,
    region: 'Region2',
    calc: {
      landarea: 200,
      building_sqft: 75,
      estimated_landscapable_area: 150,
      property_type: 'commercial'
    },
    owner: {
      name: 'Test Owner 2'
    },
    affluence_score: 50,
    source_file: 'file2',
    processed_date: '2025-01-02'
  }
];

/**
 * Mock estimate data for BI logging tests
 */
export const MOCK_BI_TEST_DATA = {
  ESTIMATE: {
    address: {
      display_name: '1234 Test Street, City, State, 12345',
      lat: 37.7749,
      lon: -122.4194
    },
    lotSizeSqFt: 10000,
    baseRatePerSqFt: { min: 4.5, max: 12 },
    designFee: 900,
    installationCost: 82500,
    maintenanceMonthly: 250,
    subtotal: { min: 45000, max: 120000 },
    minimumServiceFee: 400,
    finalEstimate: { min: 45000, max: 120000 }
  }
};

/**
 * Common API response mocks for testing
 */
export const MOCK_API_RESPONSES = {
  ADDRESS_INDEX: {
    gzipSuccess: {
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      json: () => Promise.resolve(MOCK_ADDRESS_INDEX_INDEX_DATA)
    },
    gzipInvalid: {
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      json: () => Promise.reject(new Error('Invalid gzip data'))
    },
    notFound: {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }
  },
  LOOKUP: {
    success: (
      query: string,
      results: Array<{ id: string; display_name: string; region: string }>
    ) => ({
      ok: true,
      json: () =>
        Promise.resolve({
          query,
          results,
          count: results.length
        })
    })
  }
} as const;

/**
 * Mock gzipped data for testing compression/decompression
 */
export const MOCK_GZIPPED_DATA = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

/**
 * Worker-specific test types and data
 */
export interface TestItem {
  id: string;
  name: string;
}

export interface TestBundle {
  data: TestItem[];
  lookup: Record<string, TestItem>;
  count: number;
}

export const MOCK_VERSION_MANIFEST: VersionManifest = {
  generated_at: '2024-01-15T10:30:00.000Z',
  current: {
    version: '1.2.3',
    files: {
      address_index: 'cdn/address-index-v1.2.3.json.gz',
      parcel_metadata: 'cdn/parcel-metadata-v1.2.3.json.gz',
      parcel_geometry: 'cdn/parcel-geometry-v1.2.3.json.gz'
    }
  },
  previous: {
    version: '1.2.2',
    files: {
      address_index: 'cdn/address-index-v1.2.2.json.gz',
      parcel_metadata: 'cdn/parcel-metadata-v1.2.2.json.gz',
      parcel_geometry: 'cdn/parcel-geometry-v1.2.2.json.gz'
    }
  },
  available_versions: ['1.2.3', '1.2.2']
};

export const MOCK_TEST_ITEMS: TestItem[] = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' }
];

export const MOCK_OPTIMIZED_INDEX = {
  data: MOCK_TEST_ITEMS
};

export const EXPECTED_TEST_BUNDLE: TestBundle = {
  data: MOCK_TEST_ITEMS,
  lookup: {
    '1': { id: '1', name: 'Item 1' },
    '2': { id: '2', name: 'Item 2' }
  },
  count: 2
};

/**
 * Mock FlexSearch index bundle for testing
 */
export const MOCK_FLEXSEARCH_BUNDLE: FlexSearchIndexBundle = {
  index: {
    add: vi.fn(),
    search: vi.fn().mockReturnValue([0, 1, 2]),
    remove: vi.fn(),
    update: vi.fn(),
    clear: vi.fn(),
    length: 3
  } as unknown as NonNullable<FlexSearchIndexBundle['index']>,
  parcelIds: MOCK_ADDRESS_INDEX_INDEX_DATA.parcelIds,
  addressData: MOCK_ADDRESS_INDEX_ADDRESS_DATA
};
