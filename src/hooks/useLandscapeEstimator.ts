import { useState, useCallback } from 'react';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import { estimateLandscapingPrice } from '@services/landscapeEstimator';
import { createInsufficientDataError, getErrorMessage } from '@lib/errorUtils';

/**
 * Options for the landscape estimator hook
 */
export interface LandscapeEstimatorOptions {
  /** Whether this is a commercial project (affects pricing) */
  isCommercial?: boolean;

  /** Allow multiple landscaping services in one estimate */
  serviceTypes?: Array<'design' | 'installation' | 'maintenance'>;
  /** (Deprecated) Single service type for backward compatibility */
  serviceType?:
    | 'design'
    | 'installation'
    | 'design_installation'
    | 'maintenance';

  /** Override the calculated lot size if actual measurements are known */
  overrideLotSizeSqFt?: number;
}

/**
 * Status of the landscape estimator
 */
export type EstimatorStatus = 'idle' | 'calculating' | 'complete' | 'error';

/**
 * Extended price breakdown with address information
 */
export interface EstimateResult {
  /** Address information */
  address: {
    display_name: string;
    lat: number;
    lon: number;
  };

  /** Size of the property lot in square feet */
  lotSizeSqFt: number;

  /** Base rate per square foot for landscaping work */
  baseRatePerSqFt: { min: number; max: number };

  /** Design fee estimate */
  designFee: number;

  /** Installation cost estimate */
  installationCost: number;

  /** Monthly maintenance cost estimate */
  maintenanceMonthly: number;

  /** Subtotal before minimum service fee application */
  subtotal: { min: number; max: number };

  /** Minimum service fee for any project */
  minimumServiceFee: number;

  /** Final price range estimate */
  finalEstimate: { min: number; max: number };
}

/**
 * Hook that provides landscaping price estimates based on address data
 *
 * @returns Object containing estimate data, status, and calculation functions
 */
export function useLandscapeEstimator() {
  const [status, setStatus] = useState<EstimatorStatus>('idle');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateEstimate = async (
    addressData: EnrichedAddressSuggestion,
    options?: LandscapeEstimatorOptions
  ): Promise<EstimateResult> => {
    try {
      setStatus('calculating');
      setError(null);

      if (
        !addressData.calc?.estimated_landscapable_area ||
        addressData.calc.estimated_landscapable_area === 0
      ) {
        throw createInsufficientDataError({
          address: addressData.display_name,
          landscapableArea: addressData.calc?.estimated_landscapable_area
        });
      }

      const landAreaSqFt = addressData.calc.estimated_landscapable_area;

      const latOffset = 0.001;
      const lonOffset = 0.001;
      const boundingBox: [string, string, string, string] = [
        (addressData.latitude - latOffset).toString(),
        (addressData.latitude + latOffset).toString(),
        (addressData.longitude - lonOffset).toString(),
        (addressData.longitude + lonOffset).toString()
      ];

      const estimatorOptions = {
        ...options,
        overrideLotSizeSqFt: landAreaSqFt
      };

      const priceBreakdown = estimateLandscapingPrice(
        boundingBox,
        estimatorOptions
      );

      const result: EstimateResult = {
        address: {
          display_name: addressData.display_name,
          lat: addressData.latitude,
          lon: addressData.longitude
        },
        ...priceBreakdown
      };

      setEstimate(result);
      setStatus('complete');
      return result;
    } catch (err) {
      const errorMessage = getErrorMessage(err);

      if (
        err instanceof Error &&
        err.message.includes('Insufficient data for automatic estimate')
      ) {
        setError('INSUFFICIENT_DATA');
        setStatus('error');
        throw err;
      }

      setError(errorMessage);
      setStatus('error');
      throw err;
    }
  };

  const resetEstimate = () => {
    setEstimate(null);
    setError(null);
    setStatus('idle');
  };

  return {
    estimate,
    status,
    error,
    calculateEstimate: useCallback(calculateEstimate, []),
    resetEstimate: useCallback(resetEstimate, [])
  };
}
