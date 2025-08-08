import { useState, useCallback } from 'react';
import { EnrichedAddressSuggestion } from '@app-types/localAddressTypes';
import { BoundingBox } from '@app-types/geographic';
import {
  estimateLandscapingPrice,
  estimateLandscapingPriceTiers
} from '@services/landscapeEstimator';
import {
  TieredEstimateResult,
  LandscapeEstimatorOptions,
  EstimatorStatus,
  EstimateResult
} from '@app-types/landscapeEstimatorTypes';
import { createInsufficientDataError, getErrorMessage } from '@lib/errorUtils';

/**
 * Hook that provides landscaping price estimates based on address data
 *
 * @returns Object containing estimate data, status, and calculation functions
 */
export function useLandscapeEstimator() {
  const [status, setStatus] = useState<EstimatorStatus>('idle');
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [tieredEstimate, setTieredEstimate] =
    useState<TieredEstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isTieredLoading, setIsTieredLoading] = useState(false);
  const [tieredError, setTieredError] = useState<string | null>(null);

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

      const landAreaSqFt =
        options?.overrideLotSizeSqFt ||
        addressData.calc.estimated_landscapable_area;

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

  const calculateTieredEstimate = useCallback(
    async (
      boundingBox: BoundingBox,
      settings: LandscapeEstimatorOptions,
      affluenceScore?: number
    ) => {
      try {
        setIsTieredLoading(true);
        setTieredError(null);

        const tieredResult = await estimateLandscapingPriceTiers(boundingBox, {
          isCommercial: settings.isCommercial,
          serviceTypes: settings.serviceTypes,
          overrideLotSizeSqFt: settings.overrideLotSizeSqFt,
          affluenceScore: affluenceScore
        });

        setTieredEstimate(tieredResult);
        return tieredResult;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to calculate tiered estimate';
        setTieredError(errorMessage);
        throw error;
      } finally {
        setIsTieredLoading(false);
      }
    },
    []
  );

  const resetEstimate = () => {
    setEstimate(null);
    setError(null);
    setStatus('idle');
    setTieredEstimate(null);
    setTieredError(null);
    setIsTieredLoading(false);
  };

  return {
    estimate,
    status,
    error,
    calculateEstimate: useCallback(calculateEstimate, []),
    resetEstimate: useCallback(resetEstimate, []),
    tieredEstimate,
    isTieredLoading,
    tieredError,
    calculateTieredEstimate
  };
}
