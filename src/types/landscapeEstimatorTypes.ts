/**
 * Options for the landscape estimator
 * Configures how the landscape estimate will be calculated
 */
export interface LandscapeEstimatorOptions {
  /** Whether this is a commercial project (affects pricing) */
  isCommercial?: boolean;

  /** Array of service types to include in the estimate */
  serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;

  /**
   * (Deprecated) Single service type
   * @deprecated Use serviceTypes array instead for more flexibility
   */
  serviceType?:
    | 'design'
    | 'installation'
    | 'design_installation'
    | 'maintenance';

  /** Override the calculated lot size if actual measurements are known */
  overrideLotSizeSqFt?: number;
}

/**
 * Status of the landscape estimator calculation process
 */
export type EstimatorStatus = 'idle' | 'calculating' | 'complete' | 'error';

/**
 * Complete price breakdown for a landscape estimate
 * Includes all cost components and address information
 */
export interface EstimateResult {
  /** Address information from the original query */
  address: {
    display_name: string;
    lat: number;
    lon: number;
  };

  /** Size of the property lot in square feet */
  lotSizeSqFt: number;

  /** Base rate per square foot for landscaping work */
  baseRatePerSqFt: { min: number; max: number };

  /** Design fee estimate in USD */
  designFee: number;

  /** Installation cost estimate in USD */
  installationCost: number;

  /** Monthly maintenance cost estimate in USD */
  maintenanceMonthly: number;

  /** Subtotal before minimum service fee application */
  subtotal: { min: number; max: number };

  /** Minimum service fee for any project in USD */
  minimumServiceFee: number;

  /** Final price range estimate in USD */
  finalEstimate: { min: number; max: number };
}

/**
 * Bounding box coordinates as a tuple of string values representing latitude and longitude
 * Format: [minLat, maxLat, minLon, maxLon]
 */
export type BoundingBox = [string, string, string, string];
