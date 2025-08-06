// src/services/parcelSearchEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  standardizeAddress,
  extractGeometry,
  calculateAffluenceScore,
  processParcel,
  createUnifiedDatasets,
  searchParcels,
  getProcessingLogs,
  clearProcessingLogs
} from './parcelSearchEngine';
import type { RawParcelData } from '../types/parcelTypes';

describe('Parcel Search Engine', () => {
  beforeEach(() => {
    clearProcessingLogs();
  });

  describe('Address Standardization', () => {
    it('standardizes valid residential address', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL001',
        street_address: '123 Main St',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63101'
      };

      const result = standardizeAddress(parcel);

      expect(result).toBeDefined();
      expect(result?.full_address).toBe('123 Main St, St. Louis, MO 63101');
      expect(result?.street).toBe('123 Main St');
      expect(result?.city).toBe('St. Louis');
      expect(result?.state).toBe('MO');
      expect(result?.zip).toBe('63101');
    });

    it('handles missing street address', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL002',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63101'
      };

      const result = standardizeAddress(parcel);

      expect(result).toBeNull();
      
      const logs = getProcessingLogs();
      expect(logs.missing_components).toHaveLength(1);
      expect(logs.missing_components[0]).toContain('STL002');
    });

    it('rejects PO Box addresses', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL003',
        street_address: 'PO Box 123',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63101'
      };

      const result = standardizeAddress(parcel);

      expect(result).toBeNull();
      
      const logs = getProcessingLogs();
      expect(logs.po_box_addresses).toHaveLength(1);
      expect(logs.po_box_addresses[0]).toContain('STL003');
    });

    it('rejects invalid ZIP codes', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL004',
        street_address: '123 Main St',
        city: 'St. Louis',
        state: 'MO',
        zip_code: 'INVALID'
      };

      const result = standardizeAddress(parcel);

      expect(result).toBeNull();
      
      const logs = getProcessingLogs();
      expect(logs.invalid_zip).toHaveLength(1);
      expect(logs.invalid_zip[0]).toContain('STL004');
    });

    it('accepts valid ZIP+4 format', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL005',
        street_address: '123 Main St',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63101-1234'
      };

      const result = standardizeAddress(parcel);

      expect(result).toBeDefined();
      expect(result?.zip).toBe('63101-1234');
    });
  });

  describe('Geometry Extraction', () => {
    it('extracts and normalizes polygon geometry', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL006',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-90.3010, 38.6490],
            [-90.3000, 38.6490],
            [-90.3000, 38.6500],
            [-90.3010, 38.6500],
            [-90.3010, 38.6490]
          ]]
        }
      };

      const result = extractGeometry(parcel);

      expect(result).toBeDefined();
      expect(result?.geometry.type).toBe('Polygon');
      expect(result?.boundingBox).toEqual({
        west: -90.301,
        east: -90.3,
        south: 38.649,
        north: 38.65
      });
    });

    it('handles missing geometry', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL007'
      };

      const result = extractGeometry(parcel);

      expect(result).toBeNull();
    });

    it('rejects invalid geometry types', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL008',
        geometry: {
          type: 'Point',
          coordinates: [-90.3010, 38.6490]
        } as any
      };

      const result = extractGeometry(parcel);

      expect(result).toBeNull();
    });
  });

  describe('Affluence Score Calculation', () => {
    it('calculates higher scores for affluent ZIP codes', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL009'
      };
      
      const address = {
        full_address: '123 Main St, Clayton, MO 63105',
        zip: '63105'
      };

      const score = calculateAffluenceScore(parcel, address);

      expect(score).toBeGreaterThan(70);
      expect(score).toBeLessThanOrEqual(95);
    });

    it('calculates lower scores for urban core ZIP codes', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL010'
      };
      
      const address = {
        full_address: '123 Main St, St. Louis, MO 63101',
        zip: '63101'
      };

      const score = calculateAffluenceScore(parcel, address);

      expect(score).toBeGreaterThanOrEqual(25);
      expect(score).toBeLessThan(70);
    });

    it('returns baseline score for other areas', () => {
      const parcel: RawParcelData = {
        original_parcel_id: 'STL011'
      };
      
      const address = {
        full_address: '123 Main St, St. Louis, MO 63301',
        zip: '63301'
      };

      const score = calculateAffluenceScore(parcel, address);

      expect(score).toBeGreaterThanOrEqual(35);
      expect(score).toBeLessThanOrEqual(65);
    });
  });

  describe('Parcel Processing', () => {
    it('processes complete parcel data', () => {
      const rawParcel: RawParcelData = {
        original_parcel_id: 'STL012',
        street_address: '123 Main St',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63101',
        property_type: 'residential',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-90.3010, 38.6490],
            [-90.3000, 38.6490],
            [-90.3000, 38.6500],
            [-90.3010, 38.6500],
            [-90.3010, 38.6490]
          ]]
        }
      };

      const result = processParcel(rawParcel, 'city');

      expect(result.metadata).toBeDefined();
      expect(result.geometry).toBeDefined();
      expect(result.addressKey).toBe('123 main st, st. louis, mo 63101');
      
      const metadata = result.metadata!;
      expect(metadata.id).toBe('city_STL012');
      expect(metadata.original_parcel_id).toBe('STL012');
      expect(metadata.full_address).toBe('123 Main St, St. Louis, MO 63101');
      expect(metadata.property_type).toBe('residential');
      expect(metadata.latitude).toBeCloseTo(38.6495, 3);
      expect(metadata.longitude).toBeCloseTo(-90.3005, 3);
      expect(metadata.area_sq_ft).toBeGreaterThan(0);
    });

    it('handles parcel with no geometry', () => {
      const rawParcel: RawParcelData = {
        original_parcel_id: 'STL013',
        street_address: '456 Oak Ave',
        city: 'St. Louis',
        state: 'MO',
        zip_code: '63102',
        property_type: 'commercial'
      };

      const result = processParcel(rawParcel, 'county');

      expect(result.metadata).toBeDefined();
      expect(result.geometry).toBeUndefined();
      expect(result.addressKey).toBe('456 oak ave, st. louis, mo 63102');
      
      const metadata = result.metadata!;
      expect(metadata.id).toBe('county_STL013');
      expect(metadata.property_type).toBe('commercial');
      expect(metadata.latitude).toBe(38.6272); // Default
      expect(metadata.longitude).toBe(-90.1978); // Default
    });
  });

  describe('Unified Dataset Creation', () => {
    it('creates unified datasets from processed parcels', () => {
      const processedParcels = [
        {
          metadata: {
            id: 'city_STL014',
            original_parcel_id: 'STL014',
            full_address: '123 Main St, St. Louis, MO 63101',
            latitude: 38.6495,
            longitude: -90.3005,
            property_type: 'residential' as const,
            affluence_score: 50,
            area_sq_ft: 10000
          },
          addressKey: '123 main st, st. louis, mo 63101'
        },
        {
          metadata: {
            id: 'county_STL015',
            original_parcel_id: 'STL015',
            full_address: '456 Oak Ave, St. Louis, MO 63102',
            latitude: 38.6272,
            longitude: -90.1978,
            property_type: 'commercial' as const,
            affluence_score: 60
          },
          addressKey: '456 oak ave, st. louis, mo 63102'
        }
      ];

      const result = createUnifiedDatasets(processedParcels);

      expect(result.addressIndex).toEqual({
        '123 main st, st. louis, mo 63101': 'city_STL014',
        '456 oak ave, st. louis, mo 63102': 'county_STL015'
      });
      
      expect(Object.keys(result.parcelMetadata)).toHaveLength(2);
      expect(result.parcelMetadata['city_STL014']).toBeDefined();
      expect(result.parcelMetadata['county_STL015']).toBeDefined();
    });
  });

  describe('Parcel Search', () => {
    const addressIndex = {
      '123 main st, st. louis, mo 63101': 'parcel1',
      '456 oak ave, st. louis, mo 63102': 'parcel2',
      '789 pine rd, st. louis, mo 63103': 'parcel3'
    };

    const parcelMetadata = {
      'parcel1': {
        id: 'parcel1',
        original_parcel_id: 'STL001',
        full_address: '123 Main St, St. Louis, MO 63101',
        latitude: 38.6495,
        longitude: -90.3005,
        property_type: 'residential' as const,
        affluence_score: 50
      },
      'parcel2': {
        id: 'parcel2',
        original_parcel_id: 'STL002',
        full_address: '456 Oak Ave, St. Louis, MO 63102',
        latitude: 38.6272,
        longitude: -90.1978,
        property_type: 'commercial' as const,
        affluence_score: 60
      },
      'parcel3': {
        id: 'parcel3',
        original_parcel_id: 'STL003',
        full_address: '789 Pine Rd, St. Louis, MO 63103',
        latitude: 38.6100,
        longitude: -90.2000,
        property_type: 'residential' as const,
        affluence_score: 45
      }
    };

    it('finds exact address match', () => {
      const results = searchParcels('123 Main St, St. Louis, MO 63101', addressIndex, parcelMetadata);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('parcel1');
    });

    it('finds partial matches', () => {
      const results = searchParcels('main st', addressIndex, parcelMetadata);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'parcel1')).toBe(true);
    });

    it('handles case insensitive search', () => {
      const results = searchParcels('MAIN ST', addressIndex, parcelMetadata);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id === 'parcel1')).toBe(true);
    });

    it('returns empty array for no matches', () => {
      const results = searchParcels('nonexistent street', addressIndex, parcelMetadata);

      expect(results).toHaveLength(0);
    });
  });
});