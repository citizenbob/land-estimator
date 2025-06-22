import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MOCK_PARCEL_METADATA } from '@lib/testData';
import {
  getParcelMetadata,
  getBulkParcelMetadata,
  createBoundingBoxFromParcel,
  ParcelMetadata
} from './parcelMetadata';

vi.mock('@lib/universalBundleLoader', () => ({
  createUniversalBundleLoader: () => ({
    loadBundle: vi.fn().mockResolvedValue({
      data: MOCK_PARCEL_METADATA,
      lookup: {
        p1: MOCK_PARCEL_METADATA[0],
        p2: MOCK_PARCEL_METADATA[1]
      }
    }),
    clearCache: vi.fn(),
    setTestMockModules: vi.fn()
  })
}));

describe('parcelMetadata service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getParcelMetadata returns correct metadata or null', async () => {
    const p1 = await getParcelMetadata('p1');
    expect(p1).not.toBeNull();
    expect(p1?.id).toBe('p1');

    const missing = await getParcelMetadata('unknown');
    expect(missing).toBeNull();
  });

  it('getBulkParcelMetadata returns only found items', async () => {
    const bulk = await getBulkParcelMetadata(['p1', 'p2', 'p3']);
    expect(bulk).toHaveLength(2);
    expect(bulk.map((p) => p.id)).toEqual(['p1', 'p2']);

    const none = await getBulkParcelMetadata(['x']);
    expect(none).toEqual([]);
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
