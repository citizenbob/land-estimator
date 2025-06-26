/**
 * Type definitions for parcel index building and optimization
 */

import type { ParcelMetadata } from '@services/parcelMetadata';

declare namespace ParcelIndex {
  /**
   * Optimized parcel index structure for static serving
   */
  interface OptimizedParcelIndex {
    parcels: ParcelMetadata[];
    /** parcel ID -> array index for fast lookups */
    lookup: Record<string, number>;
    timestamp: string;
    recordCount: number;
    version: string;
    exportMethod: string;
  }

  /**
   * Ultra-compressed parcel data using single-character keys
   * to minimize file size while preserving essential data
   */
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

  /**
   * Ultra-compressed index structure with minimal metadata
   */
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

  /**
   * Compression statistics for reporting
   */
  interface CompressionStats {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    gzippedSize: number;
    gzipRatio: number;
    recordCount: number;
  }

  /**
   * Build configuration options
   */
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
