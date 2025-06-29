import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLandscapeEstimator } from './useLandscapeEstimator';
import * as estimatorModule from '@services/landscapeEstimator';
import { EnrichedAddressSuggestion } from '@typez/addressMatchTypes';
import {
  MOCK_PRICE_BREAKDOWN,
  MOCK_ENRICHED_ADDRESS_DATA,
  MOCK_NOMINATIM_FALLBACK_DATA
} from '@lib/testData';

describe('useLandscapeEstimator', () => {
  const mockPriceBreakdown = MOCK_PRICE_BREAKDOWN;

  const mockAddressData: EnrichedAddressSuggestion = MOCK_ENRICHED_ADDRESS_DATA;

  const mockNominatimFallbackData: EnrichedAddressSuggestion =
    MOCK_NOMINATIM_FALLBACK_DATA;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(estimatorModule, 'estimateLandscapingPrice').mockReturnValue(
      mockPriceBreakdown
    );
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    expect(result.current.status).toBe('idle');
    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calculates estimate with enriched local address data', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    await act(async () => {
      await result.current.calculateEstimate(mockAddressData);
    });

    expect(estimatorModule.estimateLandscapingPrice).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ]),
      { overrideLotSizeSqFt: 8000 }
    );

    expect(result.current.status).toBe('complete');
    expect(result.current.estimate).toEqual({
      address: {
        display_name: '1234 Test Street, City, State, 12345',
        lat: 37.7749,
        lon: -122.4194
      },
      ...mockPriceBreakdown
    });
    expect(result.current.error).toBeNull();
  });

  it('passes options to estimateLandscapingPrice', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());
    const options = {
      isCommercial: true,
      serviceType: 'design' as const
    };

    await act(async () => {
      await result.current.calculateEstimate(mockAddressData, options);
    });

    expect(estimatorModule.estimateLandscapingPrice).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String)
      ]),
      { ...options, overrideLotSizeSqFt: 8000 }
    );
  });

  it('handles insufficient data for automatic estimates (Nominatim fallback)', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    await act(async () => {
      try {
        await result.current.calculateEstimate(mockNominatimFallbackData);
        fail('Should have thrown an error');
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          'Insufficient data for automatic estimate. In-person consultation required.'
        );
      }
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('INSUFFICIENT_DATA');
  });

  it('resets the estimate state', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    await act(async () => {
      await result.current.calculateEstimate(mockAddressData);
    });

    expect(result.current.estimate).not.toBeNull();

    act(() => {
      result.current.resetEstimate();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.estimate).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('uses latitude/longitude from EnrichedAddressSuggestion', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    await act(async () => {
      await result.current.calculateEstimate(mockAddressData);
    });

    expect(result.current.estimate?.address).toEqual({
      display_name: '1234 Test Street, City, State, 12345',
      lat: 37.7749,
      lon: -122.4194
    });
  });

  describe('Anti-regression tests for insufficient data validation', () => {
    it('should throw INSUFFICIENT_DATA error when estimated_landscapable_area is 0', async () => {
      const dataWithZeroArea: EnrichedAddressSuggestion = {
        ...mockAddressData,
        calc: {
          ...mockAddressData.calc,
          estimated_landscapable_area: 0
        }
      };

      const { result } = renderHook(() => useLandscapeEstimator());

      await act(async () => {
        try {
          await result.current.calculateEstimate(dataWithZeroArea);
          fail('Should have thrown INSUFFICIENT_DATA error');
        } catch (err) {
          expect(err instanceof Error).toBe(true);
          expect((err as Error).message).toBe(
            'Insufficient data for automatic estimate. In-person consultation required.'
          );
        }
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('INSUFFICIENT_DATA');
    });

    it('should throw INSUFFICIENT_DATA error when calc object is missing', async () => {
      const dataWithoutCalc = {
        ...mockAddressData
      };
      // @ts-expect-error - intentionally creating invalid data for testing
      delete dataWithoutCalc.calc;

      const { result } = renderHook(() => useLandscapeEstimator());

      await act(async () => {
        try {
          await result.current.calculateEstimate(dataWithoutCalc);
          fail('Should have thrown INSUFFICIENT_DATA error');
        } catch (err) {
          expect(err instanceof Error).toBe(true);
          expect((err as Error).message).toBe(
            'Insufficient data for automatic estimate. In-person consultation required.'
          );
        }
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('INSUFFICIENT_DATA');
    });

    it('should throw INSUFFICIENT_DATA error when estimated_landscapable_area is null or undefined', async () => {
      const dataWithNullArea: EnrichedAddressSuggestion = {
        ...mockAddressData,
        calc: {
          ...mockAddressData.calc,
          estimated_landscapable_area: null as unknown as number
        }
      };

      const { result } = renderHook(() => useLandscapeEstimator());

      await act(async () => {
        try {
          await result.current.calculateEstimate(dataWithNullArea);
          fail('Should have thrown INSUFFICIENT_DATA error');
        } catch (err) {
          expect(err instanceof Error).toBe(true);
          expect((err as Error).message).toBe(
            'Insufficient data for automatic estimate. In-person consultation required.'
          );
        }
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('INSUFFICIENT_DATA');
    });

    it('should succeed with valid estimated_landscapable_area > 0', async () => {
      const dataWithValidArea: EnrichedAddressSuggestion = {
        ...mockAddressData,
        calc: {
          ...mockAddressData.calc,
          estimated_landscapable_area: 5000
        }
      };

      const { result } = renderHook(() => useLandscapeEstimator());

      await act(async () => {
        await result.current.calculateEstimate(dataWithValidArea);
      });

      expect(result.current.status).toBe('complete');
      expect(result.current.error).toBeNull();
      expect(result.current.estimate).not.toBeNull();
    });
  });
});
