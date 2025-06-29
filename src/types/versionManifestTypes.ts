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
  addresses: Array<{
    display_name: string;
    parcel_id: string;
    region: string;
    latitude: number;
    longitude: number;
  }>;
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
  parcels: Array<{
    id: string;
    primary_full_address: string;
    latitude: number;
    longitude: number;
    region: string;
    calc: {
      landarea: number;
      building_sqft: number;
      estimated_landscapable_area: number;
      property_type: string;
    };
    owner: {
      name: string;
    };
    affluence_score: number;
  }>;
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
    bbox: [number, number, number, number];
  };
}
