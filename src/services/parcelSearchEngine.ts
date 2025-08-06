// src/services/parcelSearchEngine.ts

import type { 
  RawParcelData, 
  StandardizedAddress, 
  ParcelMetadata, 
  ParcelGeometry,
  AddressIndex,
  ProcessingStats 
} from '../types/parcelTypes';

/**
 * Address standardization utility
 */
export function standardizeAddress(parcel: RawParcelData): StandardizedAddress | null {
  try {
    const street = parcel.street_address?.trim();
    const city = parcel.city?.trim() || 'St. Louis';
    const state = parcel.state?.trim() || 'MO';
    const zip = parcel.zip_code?.toString().trim();

    // Validate required components
    if (!street) {
      logStandardizationFailure('missing_components', parcel, 'Missing street address');
      return null;
    }

    // Check for PO Box addresses
    if (street.toUpperCase().includes('PO BOX') || street.toUpperCase().includes('P.O. BOX')) {
      logStandardizationFailure('po_box_addresses', parcel, 'PO Box address');
      return null;
    }

    // Validate ZIP code
    if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) {
      logStandardizationFailure('invalid_zip', parcel, `Invalid ZIP code: ${zip}`);
      return null;
    }

    // Format standardized address
    const full_address = `${street}, ${city}, ${state} ${zip}`;

    return {
      full_address,
      street,
      city,
      state,
      zip
    };

  } catch (error) {
    logStandardizationFailure('processing_error', parcel, `Error: ${error}`);
    return null;
  }
}

/**
 * Extract and validate geometry
 */
export function extractGeometry(parcel: RawParcelData): { geometry: GeoJSON.Geometry; boundingBox: any } | null {
  try {
    if (!parcel.geometry) {
      return null;
    }

    const geometry = parcel.geometry;
    
    // Validate geometry type
    if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) {
      return null;
    }

    // Calculate bounding box
    const coordinates = geometry.type === 'Polygon' 
      ? geometry.coordinates[0] 
      : geometry.coordinates[0][0];
    
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    // Round coordinates to 5 decimal places for consistency
    const boundingBox = {
      west: Math.round(minLng * 100000) / 100000,
      east: Math.round(maxLng * 100000) / 100000,
      south: Math.round(minLat * 100000) / 100000,
      north: Math.round(maxLat * 100000) / 100000
    };

    // Normalize geometry coordinates
    const normalizedGeometry = {
      ...geometry,
      coordinates: geometry.type === 'Polygon'
        ? [geometry.coordinates[0].map(([lng, lat]) => [
            Math.round(lng * 100000) / 100000,
            Math.round(lat * 100000) / 100000
          ])]
        : geometry.coordinates.map(ring => 
            ring.map(coords => coords.map(([lng, lat]) => [
              Math.round(lng * 100000) / 100000,
              Math.round(lat * 100000) / 100000
            ]))
          )
    };

    return {
      geometry: normalizedGeometry,
      boundingBox
    };

  } catch (error) {
    console.warn('Error extracting geometry:', error);
    return null;
  }
}

/**
 * Calculate affluence score based on location and property data
 * This is a simplified implementation - in practice, this would use
 * demographic data, property values, etc.
 */
export function calculateAffluenceScore(parcel: RawParcelData, address: StandardizedAddress): number {
  // Simplified scoring based on ZIP code and area
  const zip = address.zip;
  const baseScore = 50; // Default baseline
  
  // Adjust based on ZIP code patterns (simplified for St. Louis area)
  if (zip) {
    const zipNum = parseInt(zip.substring(0, 5));
    
    // Higher scores for certain St. Louis area ZIP codes
    if (zipNum >= 63105 && zipNum <= 63130) {
      return Math.min(75 + Math.random() * 20, 95); // Affluent areas
    } else if (zipNum >= 63101 && zipNum <= 63104) {
      return Math.max(30 + Math.random() * 30, 25); // Urban core, variable
    } else {
      return baseScore + (Math.random() - 0.5) * 30; // Suburban baseline with variance
    }
  }
  
  return baseScore;
}

/**
 * Process raw parcel data into standardized format
 */
export function processParcel(rawParcel: RawParcelData, source: 'city' | 'county'): {
  metadata?: ParcelMetadata;
  geometry?: ParcelGeometry;
  addressKey?: string;
} {
  // Standardize address
  const standardizedAddress = standardizeAddress(rawParcel);
  if (!standardizedAddress) {
    return {};
  }

  // Extract geometry
  const geometryData = extractGeometry(rawParcel);
  
  // Generate unique ID
  const id = `${source}_${rawParcel.original_parcel_id}`;

  // Calculate affluence score
  const affluenceScore = calculateAffluenceScore(rawParcel, standardizedAddress);

  // Calculate centroid for lat/lng
  let latitude = 38.6272; // Default St. Louis lat
  let longitude = -90.1978; // Default St. Louis lng
  let area_sq_ft: number | undefined;

  if (geometryData) {
    const bbox = geometryData.boundingBox;
    latitude = (bbox.north + bbox.south) / 2;
    longitude = (bbox.east + bbox.west) / 2;
    
    // Estimate area from bounding box (simplified)
    const widthDeg = bbox.east - bbox.west;
    const heightDeg = bbox.north - bbox.south;
    area_sq_ft = Math.round(widthDeg * heightDeg * 364000 * 288000); // Rough conversion
  }

  const metadata: ParcelMetadata = {
    id,
    original_parcel_id: rawParcel.original_parcel_id,
    full_address: standardizedAddress.full_address,
    latitude,
    longitude,
    property_type: rawParcel.property_type || 'residential',
    affluence_score: Math.round(affluenceScore),
    area_sq_ft,
    bounding_box: geometryData?.boundingBox
  };

  const result: any = {
    metadata,
    addressKey: standardizedAddress.full_address.toLowerCase()
  };

  if (geometryData) {
    result.geometry = {
      id,
      geometry: geometryData.geometry,
      bounding_box: geometryData.boundingBox
    };
  }

  return result;
}

/**
 * Create unified datasets from processed parcels
 */
export function createUnifiedDatasets(processedParcels: {
  metadata: ParcelMetadata;
  geometry?: ParcelGeometry;
  addressKey: string;
}[]): {
  addressIndex: AddressIndex;
  parcelMetadata: { [id: string]: ParcelMetadata };
  parcelGeometry: { [id: string]: ParcelGeometry };
} {
  const addressIndex: AddressIndex = {};
  const parcelMetadata: { [id: string]: ParcelMetadata } = {};
  const parcelGeometry: { [id: string]: ParcelGeometry } = {};

  processedParcels.forEach(({ metadata, geometry, addressKey }) => {
    // Add to address index
    addressIndex[addressKey] = metadata.id;
    
    // Add to metadata
    parcelMetadata[metadata.id] = metadata;
    
    // Add to geometry if available
    if (geometry) {
      parcelGeometry[metadata.id] = geometry;
    }
  });

  return {
    addressIndex,
    parcelMetadata,
    parcelGeometry
  };
}

/**
 * Search for parcels by address
 */
export function searchParcels(
  query: string,
  addressIndex: AddressIndex,
  parcelMetadata: { [id: string]: ParcelMetadata }
): ParcelMetadata[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: ParcelMetadata[] = [];
  
  // Exact match first
  const exactMatch = addressIndex[normalizedQuery];
  if (exactMatch && parcelMetadata[exactMatch]) {
    results.push(parcelMetadata[exactMatch]);
  }
  
  // Partial matches
  const partialMatches = Object.keys(addressIndex)
    .filter(address => 
      address !== normalizedQuery && 
      address.includes(normalizedQuery)
    )
    .slice(0, 10) // Limit results
    .map(address => parcelMetadata[addressIndex[address]])
    .filter(Boolean);
    
  results.push(...partialMatches);
  
  return results;
}

// Logging utilities for data quality tracking
const logs: { [key: string]: string[] } = {
  missing_components: [],
  invalid_zip: [],
  po_box_addresses: [],
  processing_error: []
};

function logStandardizationFailure(type: string, parcel: RawParcelData, message: string) {
  if (!logs[type]) {
    logs[type] = [];
  }
  logs[type].push(`${parcel.original_parcel_id}: ${message}`);
}

export function getProcessingLogs() {
  return { ...logs };
}

export function clearProcessingLogs() {
  Object.keys(logs).forEach(key => {
    logs[key] = [];
  });
}