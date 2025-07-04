/**
 * Shared geographic and location types used across the application
 */

/**
 * Base geographic location interface
 */
export interface GeographicLocation {
  latitude: number;
  longitude: number;
}

/**
 * Geographic location with region information
 */
export interface RegionalLocation extends GeographicLocation {
  region: string;
}

/**
 * Bounding box coordinates as a tuple of string values representing latitude and longitude
 * Format: [minLat, maxLat, minLon, maxLon]
 */
export type BoundingBox = [string, string, string, string];

/**
 * Bounding box with numeric values for calculations
 * Format: [minLat, maxLat, minLon, maxLon]
 */
export type NumericBoundingBox = [number, number, number, number];

/**
 * Property calculation data structure
 */
export interface PropertyCalculations {
  landarea: number;
  building_sqft: number;
  estimated_landscapable_area: number;
  property_type: string;
}

/**
 * Property owner information
 */
export interface PropertyOwner {
  name: string;
}
