import type {
  RegionalLocation,
  PropertyCalculations,
  PropertyOwner,
  NumericBoundingBox
} from './geographic';

/**
 * Type definitions for version manifest and versioned CDN integration
 */

export interface VersionInfo {
  version: string;
  files: {
    address_index: string;
    parcel_metadata: string;
    parcel_geometry: string;
  };
}

export interface VersionManifest {
  generated_at: string;
  current: VersionInfo;
  previous: VersionInfo | null;
  available_versions: string[];
}

/**
 * Address index structure returned by the ingest pipeline
 */
export interface AddressIndexData {
  addresses: Array<
    {
      display_name: string;
      parcel_id: string;
    } & RegionalLocation
  >;
  metadata: {
    total_addresses: number;
    build_time: string;
    source: string;
    version: string;
  };
}

/**
 * Parcel metadata index structure returned by the ingest pipeline
 */
export interface ParcelMetadataIndex {
  parcels: Array<
    {
      id: string;
      primary_full_address: string;
      calc: PropertyCalculations;
      owner: PropertyOwner;
      affluence_score: number;
    } & RegionalLocation
  >;
  metadata: {
    total_parcels: number;
    build_time: string;
    source: string;
    version: string;
  };
}

/**
 * Parcel geometry index structure returned by the ingest pipeline
 */
export interface ParcelGeometryIndex {
  [parcelId: string]: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
    bbox: NumericBoundingBox;
  };
}
