// src/types/parcelTypes.ts

export interface RawParcelData {
  original_parcel_id: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  property_type?: 'residential' | 'commercial';
  geometry?: GeoJSON.Geometry;
  [key: string]: any; // Allow additional properties from source data
}

export interface StandardizedAddress {
  full_address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ParcelMetadata {
  id: string;
  original_parcel_id: string;
  full_address: string;
  latitude: number;
  longitude: number;
  property_type: 'residential' | 'commercial';
  affluence_score: number;
  area_sq_ft?: number;
  bounding_box?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ParcelGeometry {
  id: string;
  geometry: GeoJSON.Geometry;
  bounding_box: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface AddressIndex {
  [address: string]: string; // address -> parcel id mapping
}

export interface ProcessingStats {
  totalProcessed: number;
  validGeometry: number;
  addressStandardizationFailures: number;
  missingComponents: number;
  invalidZip: number;
  poBoxAddresses: number;
  cityRecords: number;
  countyRecords: number;
}

export interface ValidationResult {
  isValid: boolean;
  geometryValidationRate: number;
  addressFailureRate: number;
  stats: ProcessingStats;
}