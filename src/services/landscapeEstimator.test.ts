import { describe, it, expect } from 'vitest';
import { estimateLandscapingPrice } from './landscapeEstimator';

describe('landscapeEstimator', () => {
  const oneAcreBoundingBox = [
    '37.4215',
    '37.4225',
    '-122.0845',
    '-122.0835'
  ] as [string, string, string, string];

  const smallerBoundingBox = [
    '37.4215',
    '37.4220',
    '-122.0845',
    '-122.0840'
  ] as [string, string, string, string];

  const tinyBoundingBox = [
    '37.4215',
    '37.42151',
    '-122.0845',
    '-122.08451'
  ] as [string, string, string, string];

  describe('estimateLandscapingPrice', () => {
    it('should return a complete price breakdown object', () => {
      const result = estimateLandscapingPrice(oneAcreBoundingBox);

      expect(result).toHaveProperty('lotSizeSqFt');
      expect(result).toHaveProperty('baseRatePerSqFt');
      expect(result).toHaveProperty('designFee');
      expect(result).toHaveProperty('installationCost');
      expect(result).toHaveProperty('maintenanceMonthly');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('minimumServiceFee');
      expect(result).toHaveProperty('finalEstimate');
    });

    it('should calculate base rates correctly for residential projects', () => {
      const result = estimateLandscapingPrice(oneAcreBoundingBox);

      expect(result.baseRatePerSqFt.min).toEqual(4.5);
      expect(result.baseRatePerSqFt.max).toEqual(12);
    });

    it('should calculate area from bounding box correctly', () => {
      const result1 = estimateLandscapingPrice(oneAcreBoundingBox);
      const result2 = estimateLandscapingPrice(smallerBoundingBox);

      expect(result1.lotSizeSqFt).toBeGreaterThan(result2.lotSizeSqFt);
    });

    it('should apply commercial multiplier correctly', () => {
      const residential = estimateLandscapingPrice(oneAcreBoundingBox);
      const commercial = estimateLandscapingPrice(oneAcreBoundingBox, {
        isCommercial: true
      });

      // Commercial rates should be 85% of residential rates
      expect(commercial.baseRatePerSqFt.min).toBeCloseTo(
        residential.baseRatePerSqFt.min * 0.85
      );
      expect(commercial.baseRatePerSqFt.max).toBeCloseTo(
        residential.baseRatePerSqFt.max * 0.85
      );

      // Installation costs should also reflect the commercial discount
      expect(commercial.installationCost).toBeLessThan(
        residential.installationCost
      );
    });

    it('should respect overrideLotSizeSqFt when provided', () => {
      const customSize = 10000;
      const result = estimateLandscapingPrice(oneAcreBoundingBox, {
        overrideLotSizeSqFt: customSize
      });

      expect(result.lotSizeSqFt).toEqual(customSize);
    });

    describe('design service type', () => {
      it('should calculate design service costs correctly', () => {
        const result = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['design']
        });

        expect(result.designFee).toBeGreaterThan(0);
        expect(result.installationCost).toEqual(0);
        expect(result.maintenanceMonthly).toEqual(0);
      });

      it('should apply minimum service fee for design when necessary', () => {
        const result = estimateLandscapingPrice(tinyBoundingBox, {
          serviceTypes: ['design']
        });

        // Design fee should be at least the minimum service fee
        expect(result.finalEstimate.min).toBeGreaterThanOrEqual(400);
        expect(result.finalEstimate.max).toBeGreaterThanOrEqual(400);
      });
    });

    describe('installation service type', () => {
      it('should calculate installation service costs correctly', () => {
        const result = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['installation']
        });

        expect(result.designFee).toEqual(0);
        expect(result.installationCost).toBeGreaterThan(0);
        expect(result.maintenanceMonthly).toEqual(0);

        // Installation cost should be proportional to lot size
        const smallerLot = estimateLandscapingPrice(smallerBoundingBox, {
          serviceTypes: ['installation']
        });

        expect(result.installationCost).toBeGreaterThan(
          smallerLot.installationCost
        );
      });

      it('should apply minimum service fee for installation when necessary', () => {
        const result = estimateLandscapingPrice(tinyBoundingBox, {
          serviceTypes: ['installation']
        });

        // Final estimate should be at least the minimum service fee
        expect(result.finalEstimate.min).toBeGreaterThanOrEqual(400);
      });
    });

    describe('maintenance service type', () => {
      it('should calculate maintenance service costs correctly', () => {
        const result = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['maintenance']
        });

        expect(result.designFee).toEqual(0);
        expect(result.installationCost).toEqual(0);
        expect(result.maintenanceMonthly).toBeGreaterThan(0);

        // Maintenance costs should be between min and max range in config
        expect(result.maintenanceMonthly).toBeGreaterThanOrEqual(100);
        expect(result.maintenanceMonthly).toBeLessThanOrEqual(400);
      });

      it('should not scale maintenance costs with lot size', () => {
        const largeLot = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['maintenance']
        });

        const smallLot = estimateLandscapingPrice(tinyBoundingBox, {
          serviceTypes: ['maintenance']
        });

        // Maintenance costs should be the same regardless of lot size
        expect(largeLot.maintenanceMonthly).toEqual(
          smallLot.maintenanceMonthly
        );
      });
    });

    describe('design_installation bundling', () => {
      it('should apply bundled discount for design+installation services', () => {
        // First get separate costs
        const designOnly = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['design']
        });
        const installOnly = estimateLandscapingPrice(oneAcreBoundingBox, {
          serviceTypes: ['installation']
        });

        // Then get bundled cost by default (no options)
        const bundled = estimateLandscapingPrice(oneAcreBoundingBox);

        // Design fee should equal standalone design
        expect(bundled.designFee).toBeCloseTo(designOnly.designFee);
        // Total estimate min should equal sum of individual service minimums
        expect(bundled.finalEstimate.min).toEqual(
          designOnly.finalEstimate.min + installOnly.finalEstimate.min
        );
      });

      it('should apply minimum service fee when calculated cost is lower', () => {
        const result = estimateLandscapingPrice(tinyBoundingBox);
        // Combined services should apply two minimum service fees => 800
        expect(result.finalEstimate.min).toEqual(result.minimumServiceFee * 2);
      });
    });
  });
});
