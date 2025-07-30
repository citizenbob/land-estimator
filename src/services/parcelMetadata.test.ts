import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MOCK_PARCEL_METADATA } from '@lib/testData';
import {
  getParcelMetadata,
  getBulkParcelMetadata,
  createBoundingBoxFromParcel,
  ParcelMetadata
} from './parcelMetadata';
import { createTestSuite } from '@lib/testUtils';

vi.mock('@workers/versionedBundleLoader', () => ({
  loadVersionedBundle: vi.fn().mockResolvedValue({
    data: MOCK_PARCEL_METADATA,
    lookup: {
      p1: MOCK_PARCEL_METADATA[0],
      p2: MOCK_PARCEL_METADATA[1]
    }
  }),
  clearMemoryCache: vi.fn()
}));

describe('parcelMetadata service', () => {
  const testSuite = createTestSuite();

  beforeEach(() => {
    testSuite.beforeEachSetup();
  });

  afterEach(() => {
    testSuite.afterEachCleanup();
  });

  it('getParcelMetadata handles missing parcel ID gracefully', async () => {
    const result = await getParcelMetadata('');
    expect(result).toBeNull();
  });

  it('getBulkParcelMetadata handles empty array gracefully', async () => {
    const result = await getBulkParcelMetadata([]);
    expect(result).toEqual([]);
  });

  it('createBoundingBoxFromParcel returns correct bounds as strings', () => {
    const parcel: ParcelMetadata = {
      id: 'test',
      full_address: '789 Test Blvd',
      latitude: 50,
      longitude: -100,
      region: 'R',
      calc: {
        landarea: 0,
        building_sqft: 0,
        estimated_landscapable_area: 0,
        property_type: 'unknown'
      },
      owner: {
        name: 'Test Owner'
      },
      affluence_score: 0,
      source_file: '',
      processed_date: ''
    };
    const box = createBoundingBoxFromParcel(parcel);
    expect(box).toEqual(['49.999', '50.001', '-100.001', '-99.999']);
  });
});
