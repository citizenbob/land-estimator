export interface GeographicLocation {
  latitude: number;
  longitude: number;
}
export interface RegionalLocation extends GeographicLocation {
  region: string;
}

export type BoundingBox = [string, string, string, string];

export type NumericBoundingBox = [number, number, number, number];

export interface PropertyCalculations {
  landarea: number;
  building_sqft: number;
  estimated_landscapable_area: number;
  property_type: string;
}

export interface PropertyOwner {
  name: string;
}

export interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
export interface GeoShardConfig {
  bounds: GeographicBounds;
  gridSize: number;
  overlap: number;
}
export interface GeoGrid {
  id: string;
  bounds: GeographicBounds;
  center: { lat: number; lng: number };
}
