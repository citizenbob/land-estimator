import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getParcelMetadata,
  getBulkParcelMetadata,
  createBoundingBoxFromParcel,
  ParcelMetadata
} from './parcelMetadata';

// Mock the JSON data import
vi.mock('@data/parcel_metadata.json', () => ({
  default: [
    {
      id: 'p1',
      latitude: 10,
      longitude: 20,
      region: 'TestRegion',
      calc: {
        landarea: 100,
        building_sqft: 50,
        estimated_landscapable_area: 80,
        property_type: 'residential'
      },
      source_file: 'file1',
      processed_date: '2025-01-01'
    },
    {
      id: 'p2',
      latitude: -5,
      longitude: 30,
      region: 'Region2',
      calc: {
        landarea: 200,
        building_sqft: 75,
        estimated_landscapable_area: 150,
        property_type: 'commercial'
      },
      source_file: 'file2',
      processed_date: '2025-01-02'
    }
  ]
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
      latitude: 50,
      longitude: -100,
      region: 'R',
      calc: {
        landarea: 0,
        building_sqft: 0,
        estimated_landscapable_area: 0,
        property_type: 'unknown'
      },
      source_file: '',
      processed_date: ''
    };
    const box = createBoundingBoxFromParcel(parcel);
    expect(box).toEqual(['49.999', '50.001', '-100.001', '-99.999']);
  });
});
