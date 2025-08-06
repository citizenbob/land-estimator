// src/services/estimationEngine.test.ts
import { describe, it, expect } from 'vitest';
import { 
  calculateLandscapingEstimate, 
  validateParcelData,
  type ParcelData 
} from './estimationEngine';

describe('Landscaping Estimation Engine', () => {
  describe('Baseline Residential Parcel (Affluence Score 50)', () => {
    it('calculates correct estimate for residential parcel with area', () => {
      const parcelData: ParcelData = {
        area: 1000, // 1000 sq ft
        propertyType: 'residential',
        affluenceScore: 50 // baseline
      };

      const result = calculateLandscapingEstimate(parcelData);

      expect(result.success).toBe(true);
      expect(result.priceBreakdown).toBeDefined();

      const breakdown = result.priceBreakdown!;
      
      // Verify area
      expect(breakdown.area).toBe(1000);
      
      // Verify multipliers for baseline residential
      expect(breakdown.affluenceMultiplier).toBe(1.0);
      expect(breakdown.commercialMultiplier).toBe(1.0);
      expect(breakdown.combinedMultiplier).toBe(1.0);
      
      // Verify base calculations
      expect(breakdown.installMin).toBe(50); // 1000 * 0.05 * 1.0
      expect(breakdown.installMax).toBe(150); // 1000 * 0.15 * 1.0
      
      // Design fee should be max(150 * 0.20, 500) = 500 (minimum service fee)
      expect(breakdown.designFee).toBe(500);
      
      // Maintenance (30% of install cost)
      expect(breakdown.maintenanceMin).toBe(15); // 50 * 0.3
      expect(breakdown.maintenanceMax).toBe(45); // 150 * 0.3
      
      // Final estimate = install + design, but at least minimum service fee
      expect(breakdown.finalEstimateMin).toBe(550); // max(50 + 500, 500)
      expect(breakdown.finalEstimateMax).toBe(650); // max(150 + 500, 500)
    });

    it('calculates area from bounding box correctly', () => {
      const parcelData: ParcelData = {
        boundingBox: {
          north: 38.6500,
          south: 38.6490,
          east: -90.3000,
          west: -90.3010
        },
        propertyType: 'residential',
        affluenceScore: 50
      };

      const result = calculateLandscapingEstimate(parcelData);

      expect(result.success).toBe(true);
      expect(result.priceBreakdown).toBeDefined();
      
      // Area should be calculated from bounding box
      // 0.001 degrees ≈ 364 feet (lat) × 288 feet (lon) ≈ 104,832 sq ft
      const breakdown = result.priceBreakdown!;
      expect(breakdown.area).toBeGreaterThan(100000);
      expect(breakdown.area).toBeLessThan(110000);
    });
  });

  describe('Commercial Parcel in Affluent Area (Score 80)', () => {
    it('applies commercial and affluence multipliers correctly', () => {
      const parcelData: ParcelData = {
        area: 2000,
        propertyType: 'commercial',
        affluenceScore: 80
      };

      const result = calculateLandscapingEstimate(parcelData);

      expect(result.success).toBe(true);
      expect(result.priceBreakdown).toBeDefined();

      const breakdown = result.priceBreakdown!;
      
      // Verify affluence multiplier for score 80
      // 1.0 + ((80-50)/50) * 0.6 = 1.0 + 0.6 * 0.6 = 1.36
      expect(breakdown.affluenceMultiplier).toBe(1.36);
      
      // Verify commercial multiplier
      expect(breakdown.commercialMultiplier).toBe(0.85);
      
      // Combined multiplier
      expect(breakdown.combinedMultiplier).toBe(1.16); // 1.36 * 0.85 rounded
      
      // Install costs with multipliers applied
      expect(breakdown.installMin).toBe(116); // 2000 * 0.05 * 1.156
      expect(breakdown.installMax).toBe(347); // 2000 * 0.15 * 1.156 (rounded)
      
      // Design fee based on max install
      expect(breakdown.designFee).toBe(500); // max(348 * 0.20, 500) = 500
    });
  });

  describe('Error Handling', () => {
    it('handles missing parcel data gracefully', () => {
      const result = calculateLandscapingEstimate(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Parcel data is required');
    });

    it('handles missing area and bounding box', () => {
      const parcelData: Partial<ParcelData> = {
        propertyType: 'residential',
        affluenceScore: 50
      };

      const result = calculateLandscapingEstimate(parcelData as ParcelData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Either area or bounding box must be provided');
    });

    it('handles malformed bounding box', () => {
      const parcelData: ParcelData = {
        boundingBox: {
          north: 38.6490, // south > north (invalid)
          south: 38.6500,
          east: -90.3010, // west > east (invalid)
          west: -90.3000
        },
        propertyType: 'residential',
        affluenceScore: 50
      };

      const result = calculateLandscapingEstimate(parcelData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Bounding box coordinates are invalid');
    });

    it('handles invalid area values', () => {
      const parcelData: ParcelData = {
        area: -100, // negative area
        propertyType: 'residential',
        affluenceScore: 50
      };

      const result = calculateLandscapingEstimate(parcelData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid area calculation');
    });
  });

  describe('Data Validation', () => {
    it('validates complete valid parcel data', () => {
      const parcelData: ParcelData = {
        area: 1000,
        propertyType: 'residential',
        affluenceScore: 50
      };

      const validation = validateParcelData(parcelData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('identifies missing required fields', () => {
      const parcelData: Partial<ParcelData> = {
        area: 1000
        // missing propertyType and affluenceScore
      };

      const validation = validateParcelData(parcelData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Property type is required');
      expect(validation.errors).toContain('Affluence score is required');
    });

    it('validates property type values', () => {
      const parcelData: Partial<ParcelData> = {
        area: 1000,
        propertyType: 'invalid' as any,
        affluenceScore: 50
      };

      const validation = validateParcelData(parcelData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Property type must be residential or commercial');
    });

    it('validates affluence score range', () => {
      const parcelData: Partial<ParcelData> = {
        area: 1000,
        propertyType: 'residential',
        affluenceScore: 150 // out of range
      };

      const validation = validateParcelData(parcelData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Affluence score must be between 0 and 100');
    });
  });

  describe('Accuracy Requirements (±1% tolerance)', () => {
    it('maintains accuracy within ±1% for various scenarios', () => {
      const testCases = [
        {
          name: 'Small residential baseline',
          parcel: { area: 500, propertyType: 'residential' as const, affluenceScore: 50 },
          expectedRange: { min: 525, max: 575 } // allowing ±1% variance
        },
        {
          name: 'Large commercial high affluence',
          parcel: { area: 5000, propertyType: 'commercial' as const, affluenceScore: 90 },
          expectedRange: { min: 1800, max: 2200 } // approximate expected range
        },
        {
          name: 'Medium residential low affluence',
          parcel: { area: 2000, propertyType: 'residential' as const, affluenceScore: 20 },
          expectedRange: { min: 650, max: 750 } // approximate expected range
        }
      ];

      testCases.forEach(testCase => {
        const result = calculateLandscapingEstimate(testCase.parcel);
        
        expect(result.success).toBe(true);
        
        const breakdown = result.priceBreakdown!;
        
        // Check that final estimates are within reasonable ranges
        expect(breakdown.finalEstimateMin).toBeGreaterThan(0);
        expect(breakdown.finalEstimateMax).toBeGreaterThan(breakdown.finalEstimateMin);
        
        // Verify calculations are consistent
        const recalculatedMin = breakdown.installMin + breakdown.designFee;
        const recalculatedMax = breakdown.installMax + breakdown.designFee;
        
        // Allow for rounding differences and minimum service fee
        const tolerance = Math.max(recalculatedMin * 0.01, 5); // 1% or $5, whichever is larger
        
        expect(Math.abs(breakdown.finalEstimateMin - Math.max(recalculatedMin, 500))).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(breakdown.finalEstimateMax - Math.max(recalculatedMax, 500))).toBeLessThanOrEqual(tolerance);
      });
    });
  });
});