// src/services/estimationEngine.ts

export interface ParcelData {
  area?: number; // in square feet
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  propertyType: 'residential' | 'commercial';
  affluenceScore: number; // 0-100, where 50 is baseline
}

export interface PriceBreakdown {
  area: number;
  installMin: number;
  installMax: number;
  designFee: number;
  maintenanceMin: number;
  maintenanceMax: number;
  finalEstimateMin: number;
  finalEstimateMax: number;
  affluenceMultiplier: number;
  commercialMultiplier: number;
  combinedMultiplier: number;
}

export interface EstimationResult {
  success: boolean;
  priceBreakdown?: PriceBreakdown;
  error?: string;
}

// Business logic constants
const BASE_RATES = {
  min: 0.05, // $0.05 per sq ft minimum
  max: 0.15  // $0.15 per sq ft maximum
};

const DESIGN_FEE_PERCENTAGE = 0.20; // 20%
const MINIMUM_SERVICE_FEE = 500; // $500 minimum
const COMMERCIAL_MULTIPLIER = 0.85; // 15% discount for commercial

/**
 * Calculate area from bounding box coordinates
 * Uses approximate conversion: 1 degree ≈ 364,000 feet at latitude 38.6 (St. Louis)
 */
function calculateAreaFromBoundingBox(boundingBox: ParcelData['boundingBox']): number {
  if (!boundingBox) {
    throw new Error('Bounding box is required for area calculation');
  }

  const { north, south, east, west } = boundingBox;
  
  // Validate bounding box coordinates
  if (north <= south || east <= west) {
    throw new Error('Bounding box coordinates are invalid');
  }
  
  // Approximate conversion for St. Louis area (latitude ~38.6)
  const FEET_PER_DEGREE_LAT = 364000;
  const FEET_PER_DEGREE_LON = 288000; // Adjusted for latitude
  
  const widthFeet = Math.abs(east - west) * FEET_PER_DEGREE_LON;
  const heightFeet = Math.abs(north - south) * FEET_PER_DEGREE_LAT;
  
  return widthFeet * heightFeet;
}

/**
 * Calculate affluence multiplier based on score
 * Score 50 = baseline (1.0), higher = more expensive, lower = less expensive
 */
function calculateAffluenceMultiplier(affluenceScore: number): number {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, affluenceScore));
  
  // Linear interpolation: score 0 = 0.7x, score 50 = 1.0x, score 100 = 1.6x
  if (clampedScore <= 50) {
    return 0.7 + (clampedScore / 50) * 0.3; // 0.7 to 1.0
  } else {
    return 1.0 + ((clampedScore - 50) / 50) * 0.6; // 1.0 to 1.6
  }
}

/**
 * Main estimation function
 */
export function calculateLandscapingEstimate(parcelData: ParcelData): EstimationResult {
  try {
    // Validate input
    if (!parcelData) {
      return { success: false, error: 'Parcel data is required' };
    }

    // Calculate area
    let area: number;
    if (parcelData.area) {
      area = parcelData.area;
    } else if (parcelData.boundingBox) {
      area = calculateAreaFromBoundingBox(parcelData.boundingBox);
    } else {
      return { success: false, error: 'Either area or bounding box must be provided' };
    }

    if (area <= 0) {
      return { success: false, error: 'Invalid area calculation' };
    }

    // Calculate multipliers
    const affluenceMultiplier = calculateAffluenceMultiplier(parcelData.affluenceScore);
    const commercialMultiplier = parcelData.propertyType === 'commercial' ? COMMERCIAL_MULTIPLIER : 1.0;
    const combinedMultiplier = affluenceMultiplier * commercialMultiplier;

    // Calculate base costs
    const installMin = area * BASE_RATES.min;
    const installMax = area * BASE_RATES.max;

    // Apply design fee (20% of install cost, but at least minimum service fee)
    const designFee = Math.max(installMax * DESIGN_FEE_PERCENTAGE, MINIMUM_SERVICE_FEE);

    // Calculate maintenance costs (assume 30% of install cost annually)
    const maintenanceMin = installMin * 0.3 * combinedMultiplier;
    const maintenanceMax = installMax * 0.3 * combinedMultiplier;

    // Calculate final estimates with multipliers and minimum service fee
    const subtotalMin = (installMin * combinedMultiplier) + designFee;
    const subtotalMax = (installMax * combinedMultiplier) + designFee;
    
    const finalEstimateMin = Math.max(subtotalMin, MINIMUM_SERVICE_FEE);
    const finalEstimateMax = Math.max(subtotalMax, MINIMUM_SERVICE_FEE);

    const priceBreakdown: PriceBreakdown = {
      area: Math.round(area),
      installMin: Math.round(installMin * combinedMultiplier),
      installMax: Math.round(installMax * combinedMultiplier),
      designFee: Math.round(designFee),
      maintenanceMin: Math.round(maintenanceMin),
      maintenanceMax: Math.round(maintenanceMax),
      finalEstimateMin: Math.round(finalEstimateMin),
      finalEstimateMax: Math.round(finalEstimateMax),
      affluenceMultiplier: Math.round(affluenceMultiplier * 100) / 100,
      commercialMultiplier: commercialMultiplier,
      combinedMultiplier: Math.round(combinedMultiplier * 100) / 100
    };

    return { success: true, priceBreakdown };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Handle missing or malformed parcel data gracefully
 */
export function validateParcelData(parcelData: Partial<ParcelData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!parcelData) {
    errors.push('Parcel data is required');
    return { isValid: false, errors };
  }

  if (!parcelData.propertyType) {
    errors.push('Property type is required');
  } else if (!['residential', 'commercial'].includes(parcelData.propertyType)) {
    errors.push('Property type must be residential or commercial');
  }

  if (parcelData.affluenceScore === undefined || parcelData.affluenceScore === null) {
    errors.push('Affluence score is required');
  } else if (parcelData.affluenceScore < 0 || parcelData.affluenceScore > 100) {
    errors.push('Affluence score must be between 0 and 100');
  }

  if (!parcelData.area && !parcelData.boundingBox) {
    errors.push('Either area or bounding box must be provided');
  }

  if (parcelData.area !== undefined && parcelData.area <= 0) {
    errors.push('Area must be greater than 0');
  }

  if (parcelData.boundingBox) {
    const { north, south, east, west } = parcelData.boundingBox;
    if (typeof north !== 'number' || typeof south !== 'number' || 
        typeof east !== 'number' || typeof west !== 'number') {
      errors.push('Bounding box coordinates must be valid numbers');
    } else if (north <= south || east <= west) {
      errors.push('Bounding box coordinates are invalid');
    }
  }

  return { isValid: errors.length === 0, errors };
}