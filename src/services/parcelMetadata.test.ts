import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MOCK_PARCEL_METADATA } from '@lib/testData';
import {
  getParcelMetadata,
  getBulkParcelMetadata,
  createBoundingBoxFromParcel,
  ParcelMetadata
} from './parcelMetadata';

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getParcelMetadata throws error when service is disabled', async () => {
    await expect(getParcelMetadata()).rejects.toThrow(
      'Parcel metadata service is disabled. Use the simplified address lookup instead.'
    );
  });

  it('getBulkParcelMetadata throws error when service is disabled', async () => {
    await expect(getBulkParcelMetadata()).rejects.toThrow(
      'Parcel metadata service is disabled. Use the simplified address lookup instead.'
    );
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
