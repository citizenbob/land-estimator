export interface ParcelOwner {
  name: string;
}

export interface RawParcelCalculations {
  landarea_sqft: number;
  building_sqft: number;
  estimated_landscapable_area_sqft: number;
  property_type: string;
}

export interface ProcessedParcelCalculations {
  landarea: number;
  building_sqft: number;
  estimated_landscapable_area: number;
  property_type: string;
}

export interface RawParcelData {
  id: string;
  primary_full_address: string;
  latitude: number;
  longitude: number;
  region: string;
  calc: RawParcelCalculations;
  owner: ParcelOwner;
  affluence_score: number;
  source_file?: string;
  processed_date?: string;
}

export interface ParcelMetadata {
  id: string;
  full_address: string;
  latitude: number;
  longitude: number;
  region: string;
  calc: ProcessedParcelCalculations;
  owner: ParcelOwner;
  affluence_score: number;
  source_file: string;
  processed_date: string;
}

export type ParcelRegion = 'stl_city' | 'stl_county';

declare namespace ParcelIndex {
  interface OptimizedParcelIndex {
    parcels: ParcelMetadata[];
    lookup: Record<string, number>;
    timestamp: string;
    recordCount: number;
    version: string;
    exportMethod: string;
  }
  interface UltraCompressedParcel {
    /** id - Parcel identifier */
    i: string;
    /** address - Full address string */
    a: string;
    /** latitude - Geographic latitude */
    t: number;
    /** longitude - Geographic longitude */
    g: number;
    /** region - Geographic region/municipality */
    r?: string;
    /** landarea - Total land area in square feet */
    l?: number;
    /** building_sqft - Building square footage */
    b?: number;
    /** estimated_landscapable_area - Landscapable area estimate */
    e?: number;
    /** property_type - Property classification */
    p?: string;
    /** owner - Owner name */
    o?: string;
    /** affluence_score - Calculated affluence score */
    s?: number;
  }
  interface UltraCompressedIndex {
    /** parcels - Array of compressed parcel data */
    p: UltraCompressedParcel[];
    /** lookup - Parcel ID to array index mapping */
    l: Record<string, number>;
    /** timestamp - Build timestamp */
    t: string;
    /** count - Number of records */
    c: number;
    /** version - Data version */
    v: string;
  }
  interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    gzippedSize: number;
    gzipRatio: number;
    recordCount: number;
  }
  interface BuildOptions {
    /** Use ultra compression (shorter keys) */
    ultraCompress?: boolean;
    /** Maximum gzip compression level (1-9) */
    compressionLevel?: number;
    /** Include debug information in output */
    includeDebugInfo?: boolean;
    /** Output file prefix */
    outputPrefix?: string;
  }
}

export = ParcelIndex;
