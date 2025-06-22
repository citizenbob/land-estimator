import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logEstimateForBI } from '@services/biLogging';
import { logEvent } from '@services/logger';
import type { EstimateResult } from '@typez/landscapeEstimatorTypes';
import type { EnrichedAddressSuggestion } from '@typez/addressMatchTypes';

vi.mock('@services/logger', () => ({
  logEvent: vi.fn()
}));

const mockLogEvent = logEvent as ReturnType<typeof vi.fn>;

describe('biLogging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logEstimateForBI', () => {
    const mockEstimate: EstimateResult = {
      address: {
        display_name: '1234 Test Street, City, State, 12345',
        lat: 37.7749,
        lon: -122.4194
      },
      lotSizeSqFt: 10000,
      baseRatePerSqFt: { min: 4.5, max: 12 },
      designFee: 900,
      installationCost: 82500,
      maintenanceMonthly: 250,
      subtotal: { min: 45000, max: 120000 },
      minimumServiceFee: 400,
      finalEstimate: { min: 45000, max: 120000 }
    };

    const mockAddressData: EnrichedAddressSuggestion = {
      place_id: 'test_place_123',
      display_name: '1234 Test Street, City, State, 12345',
      latitude: 37.7749,
      longitude: -122.4194,
      region: 'Missouri',
      calc: {
        landarea: 10000,
        building_sqft: 2000,
        estimated_landscapable_area: 8000,
        property_type: 'residential'
      },
      affluence_score: 0.75
    };

    const mockSelectedServices = ['design', 'installation'];
    const mockHasCustomLotSize = false;

    it('should call logEvent with correct parameters for mid-market estimate', () => {
      logEstimateForBI({
        addressData: mockAddressData,
        estimate: mockEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledWith(
        'estimate_generated',
        {
          address_id: 'test_place_123',
          full_address: '1234 Test Street, City, State, 12345',
          region: 'Missouri',
          latitude: 37.7749,
          longitude: -122.4194,
          lot_size_sqft: 10000,
          building_size_sqft: 2000,
          estimated_landscapable_area: 8000,
          property_type: 'residential',
          affluence_score: 0.75,
          selected_services: ['design', 'installation'],
          design_fee: 900,
          installation_cost: 82500,
          maintenance_monthly: 250,
          estimate_min: 45000,
          estimate_max: 120000,
          estimate_range_size: 75000,
          price_per_sqft_min: 4.5,
          price_per_sqft_max: 12,
          is_commercial: true,
          has_custom_lot_size: false,
          lead_score: Math.round(0.75 * 10 + Math.min(82500 / 1000, 50)),
          market_segment: 'luxury'
        },
        {
          toFirestore: true,
          toMixpanel: true
        }
      );
    });

    it('should classify budget market segment correctly', () => {
      const budgetEstimate: EstimateResult = {
        ...mockEstimate,
        finalEstimate: { min: 2000, max: 4000 }
      };

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: budgetEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].market_segment).toBe('budget');
      expect(call[1].estimate_min).toBe(2000);
      expect(call[1].estimate_max).toBe(4000);
    });

    it('should classify mid-market segment correctly', () => {
      const midMarketEstimate: EstimateResult = {
        ...mockEstimate,
        finalEstimate: { min: 8000, max: 12000 }
      };

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: midMarketEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].market_segment).toBe('mid-market');
      expect(call[1].estimate_min).toBe(8000);
      expect(call[1].estimate_max).toBe(12000);
    });

    it('should classify premium market segment correctly', () => {
      const premiumEstimate: EstimateResult = {
        ...mockEstimate,
        finalEstimate: { min: 20000, max: 30000 }
      };

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: premiumEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].market_segment).toBe('premium');
      expect(call[1].estimate_min).toBe(20000);
      expect(call[1].estimate_max).toBe(30000);
    });

    it('should handle missing optional address data gracefully', () => {
      const incompleteAddressData: EnrichedAddressSuggestion = {
        place_id: 'test_place_123',
        display_name: '1234 Test Street, City, State, 12345',
        latitude: 37.7749,
        longitude: -122.4194,
        region: '',
        calc: {
          landarea: 0,
          building_sqft: 0,
          estimated_landscapable_area: 0,
          property_type: 'unknown'
        },
        affluence_score: 0
      };

      logEstimateForBI({
        addressData: incompleteAddressData,
        estimate: mockEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].region).toBe('Unknown');
      expect(call[1].building_size_sqft).toBe(0);
      expect(call[1].estimated_landscapable_area).toBe(0);
      expect(call[1].property_type).toBe('unknown');
      expect(call[1].affluence_score).toBe(0);
    });

    it('should detect commercial properties based on lot size', () => {
      const commercialEstimate: EstimateResult = {
        ...mockEstimate,
        lotSizeSqFt: 25000,
        finalEstimate: { min: 10000, max: 15000 }
      };

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: commercialEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].is_commercial).toBe(true);
      expect(call[1].lot_size_sqft).toBe(25000);
    });

    it('should detect commercial properties based on building size', () => {
      const commercialAddressData: EnrichedAddressSuggestion = {
        ...mockAddressData,
        calc: {
          ...mockAddressData.calc!,
          building_sqft: 15000
        }
      };

      const smallEstimate: EstimateResult = {
        ...mockEstimate,
        lotSizeSqFt: 5000,
        finalEstimate: { min: 10000, max: 15000 }
      };

      logEstimateForBI({
        addressData: commercialAddressData,
        estimate: smallEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].is_commercial).toBe(true);
      expect(call[1].building_size_sqft).toBe(15000);
    });

    it('should detect commercial properties based on estimate amount', () => {
      const highEstimate: EstimateResult = {
        ...mockEstimate,
        lotSizeSqFt: 5000,
        finalEstimate: { min: 30000, max: 35000 }
      };

      const smallBuildingAddressData: EnrichedAddressSuggestion = {
        ...mockAddressData,
        calc: {
          ...mockAddressData.calc!,
          building_sqft: 1500
        }
      };

      logEstimateForBI({
        addressData: smallBuildingAddressData,
        estimate: highEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].is_commercial).toBe(true);
    });

    it('should calculate correct lead score', () => {
      const highAffluenceAddress: EnrichedAddressSuggestion = {
        ...mockAddressData,
        affluence_score: 0.9
      };

      const premiumEstimate: EstimateResult = {
        ...mockEstimate,
        finalEstimate: { min: 40000, max: 60000 }
      };

      logEstimateForBI({
        addressData: highAffluenceAddress,
        estimate: premiumEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      // affluenceScore = 0.9 * 10 = 9
      // estimateScore = min(50000 / 1000, 50) = 50
      // leadScore = round(9 + 50) = 59
      expect(call[1].lead_score).toBe(59);
    });

    it('should handle custom lot size flag', () => {
      logEstimateForBI({
        addressData: mockAddressData,
        estimate: mockEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: true
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].has_custom_lot_size).toBe(true);
    });

    it('should calculate price per square foot correctly', () => {
      const smallLotEstimate: EstimateResult = {
        ...mockEstimate,
        lotSizeSqFt: 5000,
        finalEstimate: { min: 10000, max: 20000 }
      };

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: smallLotEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].price_per_sqft_min).toBe(2);
      expect(call[1].price_per_sqft_max).toBe(4);
    });

    it('should pass through selected services array', () => {
      const customServices = ['design', 'installation', 'maintenance'];

      logEstimateForBI({
        addressData: mockAddressData,
        estimate: mockEstimate,
        selectedServices: customServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[1].selected_services).toEqual(customServices);
    });

    it('should use correct logging options', () => {
      logEstimateForBI({
        addressData: mockAddressData,
        estimate: mockEstimate,
        selectedServices: mockSelectedServices,
        hasCustomLotSize: mockHasCustomLotSize
      });

      const call = mockLogEvent.mock.calls[0];
      expect(call[2]).toEqual({
        toFirestore: true,
        toMixpanel: true
      });
    });
  });
});
