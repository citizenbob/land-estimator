import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLandscapeEstimator } from './useLandscapeEstimator';
import * as estimatorModule from '@services/landscapeEstimator';
import { EnrichedAddressSuggestion } from '@typez/addressMatchTypes';

describe('useLandscapeEstimator', () => {
  const mockPriceBreakdown = {
    lotSizeSqFt: 10000,
    baseRatePerSqFt: { min: 4.5, max: 12 },
    designFee: 900,
    installationCost: 82500,
    maintenanceMonthly: 0,
    subtotal: { min: 45000, max: 120000 },
    minimumServiceFee: 400,
    finalEstimate: { min: 45000, max: 120000 }
  };

  const mockAddressData: EnrichedAddressSuggestion = {
    place_id: 12345,
    display_name: '1234 Test Street, City, State, 12345',
    lat: '37.7749',
    lon: '-122.4194',
    boundingbox: ['37.7748', '37.7750', '-122.4195', '-122.4193']
  };

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

  it('calculates estimate with address data', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());

    await act(async () => {
      await result.current.calculateEstimate(mockAddressData);
    });

    expect(estimatorModule.estimateLandscapingPrice).toHaveBeenCalledWith(
      ['37.7748', '37.7750', '-122.4195', '-122.4193'],
      undefined
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
      ['37.7748', '37.7750', '-122.4195', '-122.4193'],
      options
    );
  });

  it('handles missing boundingbox data', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());
    const invalidAddressData = { ...mockAddressData, boundingbox: undefined };

    await act(async () => {
      try {
        await result.current.calculateEstimate(invalidAddressData);
        fail('Should have thrown an error');
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          'Missing bounding box data for address'
        );
      }
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Missing bounding box data for address');
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

  it('handles numeric lat/lon values', async () => {
    const { result } = renderHook(() => useLandscapeEstimator());
    const numericLatLonAddress = {
      ...mockAddressData,
      lat: 37.7749,
      lon: -122.4194
    };

    await act(async () => {
      await result.current.calculateEstimate(numericLatLonAddress);
    });

    expect(result.current.estimate?.address).toEqual({
      display_name: '1234 Test Street, City, State, 12345',
      lat: 37.7749,
      lon: -122.4194
    });
  });
});
